// ═══════════════════════════════════════════════════════
// rowSync.ts — localStorage 배열(기록·저장 코디·옷장) ↔ user_items 행 동기화
//
// 화면은 계속 localStorage 배열을 읽는다. 여기서는
// - 마지막 동기화 시점의 항목 해시(snapshot)와 지금 배열을 비교해 바뀐/새/지워진 항목만 올리고
// - 서버에서 since 이후 바뀐 행만 받아 배열에 병합한다 (tombstone 은 삭제)
// 충돌: 이 기기에서 마지막 동기화 후 손댄 항목은 로컬이 이기고 다음 push 에 올라간다. 그 외엔 서버.
// ═══════════════════════════════════════════════════════
import { supabase } from '@/lib/supabase'
import { getJSON, setJSON } from '@/lib/storage'

export type RowKind = 'ootd' | 'saved' | 'wardrobe'
export const ROW_KINDS: { kind: RowKind; key: string }[] = [
  { kind: 'ootd', key: 'sp_ootd_records' },
  { kind: 'saved', key: 'cs_saved' },
  { kind: 'wardrobe', key: 'sp_wardrobe' },
]
export const ROW_KEYS = ROW_KINDS.map(k => k.key)

const SNAP_KEY = 'bp_rows_snapshot'   // { [kind]: { [id]: hash } }
const SINCE_KEY = 'bp_rows_since'     // { [kind]: iso }
const PUSH_CHUNK = 100

type Item = { id: string; createdAt?: number | string; [k: string]: unknown }
type Snapshot = Record<string, Record<string, string>>

function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + ':' + s.length.toString(36)
}
const itemHash = (it: Item) => hash(JSON.stringify(it))

function readArr(key: string): Item[] {
  const a = getJSON<unknown>(key, [])
  return Array.isArray(a) ? (a as Item[]).filter(x => x && typeof x === 'object') : []
}
function ensureIds(arr: Item[]): boolean {
  let changed = false
  arr.forEach(it => { if (!it.id) { it.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); changed = true } })
  return changed
}
function snap(): Snapshot { return getJSON<Snapshot>(SNAP_KEY, {}) }
function saveSnap(s: Snapshot) { try { setJSON(SNAP_KEY, s) } catch {} }
function since(): Record<string, string> { return getJSON<Record<string, string>>(SINCE_KEY, {}) }
function saveSince(s: Record<string, string>) { try { setJSON(SINCE_KEY, s) } catch {} }

export function resetRowSyncState() {
  try { localStorage.removeItem(SNAP_KEY); localStorage.removeItem(SINCE_KEY) } catch {}
}

/** 이 종류에 로컬 변경(추가/수정/삭제)이 있는지 */
export function hasLocalRowChanges(): boolean {
  const s = snap()
  return ROW_KINDS.some(({ kind, key }) => {
    const arr = readArr(key); const prev = s[kind] || {}
    const ids = new Set<string>()
    for (const it of arr) { if (!it.id) return true; ids.add(it.id); if (prev[it.id] !== itemHash(it)) return true }
    return Object.keys(prev).some(id => !ids.has(id))
  })
}

/** 바뀐/새 항목 upsert, 사라진 항목 tombstone. 성공한 종류만 snapshot 갱신 */
export async function pushRows(userId: string): Promise<{ pushed: number; failed: boolean }> {
  const s = snap(); let pushed = 0; let failed = false
  for (const { kind, key } of ROW_KINDS) {
    const arr = readArr(key)
    if (ensureIds(arr)) { try { setJSON(key, arr) } catch {} }
    const prev = s[kind] || {}
    const next: Record<string, string> = {}
    const rows: { user_id: string; kind: string; id: string; data: Item | null; deleted_at: string | null }[] = []
    const seen = new Set<string>()
    for (const it of arr) {
      const h = itemHash(it); next[it.id] = h; seen.add(it.id)
      if (prev[it.id] !== h) rows.push({ user_id: userId, kind, id: it.id, data: it, deleted_at: null })
    }
    for (const id of Object.keys(prev)) if (!seen.has(id)) rows.push({ user_id: userId, kind, id, data: null, deleted_at: new Date().toISOString() })
    if (rows.length === 0) { s[kind] = next; continue }
    try {
      for (let i = 0; i < rows.length; i += PUSH_CHUNK) {
        const chunk = rows.slice(i, i + PUSH_CHUNK).map(r => ({ ...r, data: r.data ?? {} }))
        const { error } = await supabase.from('user_items').upsert(chunk, { onConflict: 'user_id,kind,id' })
        if (error) throw error
      }
      s[kind] = next; pushed += rows.length
    } catch (e) {
      console.warn('[rowSync] push failed:', kind, e); failed = true
    }
  }
  saveSnap(s)
  return { pushed, failed }
}

/** since 이후 서버 변경을 받아 로컬 배열에 병합. 반환: 바뀐 종류 수 */
export async function pullRows(userId: string): Promise<{ applied: number; failed: boolean }> {
  const s = snap(); const sn = since(); let applied = 0; let failed = false
  for (const { kind, key } of ROW_KINDS) {
    try {
      let q = supabase.from('user_items').select('id, data, updated_at, deleted_at').eq('user_id', userId).eq('kind', kind).order('updated_at', { ascending: true }).limit(1000)
      if (sn[kind]) q = q.gt('updated_at', sn[kind])
      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) continue

      const arr = readArr(key)
      const prev = s[kind] || {}
      const byId = new Map(arr.map(it => [it.id, it]))
      let changed = false
      for (const row of data) {
        const local = byId.get(row.id)
        const localDirty = local ? prev[row.id] !== itemHash(local) : (prev[row.id] === undefined ? false : true)
        if (row.deleted_at) {
          if (local && !localDirty) { byId.delete(row.id); changed = true }
          delete prev[row.id]
          continue
        }
        const remote = { ...(row.data as Item), id: row.id }
        if (local && localDirty) continue // 이 기기에서 방금 손댄 항목: 로컬 우선, 다음 push 에 올라간다
        const rh = itemHash(remote)
        if (!local || itemHash(local) !== rh) { byId.set(row.id, remote); changed = true }
        prev[row.id] = rh
      }
      if (changed) {
        // 순서: 기존 순서 유지 + 새 항목은 createdAt 내림차순 위치로 (없으면 앞에)
        const merged = arr.filter(it => byId.has(it.id)).map(it => byId.get(it.id)!)
        const known = new Set(merged.map(it => it.id))
        const added = [...byId.values()].filter(it => !known.has(it.id))
        const ts = (it: Item) => { const c = it.createdAt; return typeof c === 'number' ? c : c ? new Date(c).getTime() || 0 : 0 }
        const out = [...added, ...merged].sort((a, b) => ts(b) - ts(a))
        setJSON(key, out)
        applied++
      }
      s[kind] = prev
      sn[kind] = data[data.length - 1].updated_at
    } catch (e) {
      console.warn('[rowSync] pull failed:', kind, e); failed = true
    }
  }
  saveSnap(s); saveSince(sn)
  return { applied, failed }
}

/**
 * 이 계정으로 이 기기에서 처음: 서버에 행이 하나도 없으면 로컬(또는 blob 에서 내려받은) 배열을 전부 올린다.
 * 서버에 행이 있으면 pull 이 병합한다. snapshot 을 비워 전체가 "새 항목"으로 잡히게 한다.
 */
export async function bootstrapRows(userId: string) {
  resetRowSyncState()
  const { count } = await supabase.from('user_items').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (!count) await pushRows(userId)
}
