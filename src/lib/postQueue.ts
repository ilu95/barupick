// ═══════════════════════════════════════════════════════
// postQueue.ts — 기록 → 커뮤니티 게시를 "큐"로
//
// 전에는 기록 저장 직후 posts insert 를 던지고 결과를 보지 않았다. 실패하면
// 로컬엔 "공개"인데 커뮤니티엔 없는 유령 기록이 남고, 삭제는 로컬만 지워 고아 게시물이 남았다.
// 이제:
// - 게시/비공개/삭제 작업을 localStorage 큐(bp_post_queue)에 넣고
// - 즉시·로그인·앱 재개·온라인 복귀 때 순서대로 처리한다 (실패는 지수 백오프로 재시도)
// - 게시 전에 data URL 사진을 Storage 에 올려 URL 로 바꾼다 (기록에도 URL 로 저장)
// - 화면은 usePostQueue() 로 "게시 대기 중"을 알 수 있다
// ═══════════════════════════════════════════════════════
import { useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabase'
import i18n from '@/i18n'
import { getJSON, setJSON } from '@/lib/storage'
import { isOnline, onAppResume, onNetworkChange } from '@/lib/appLifecycle'
import { isDataUrl, uploadPhotos } from '@/lib/photos'

const QUEUE_KEY = 'bp_post_queue'
const RECORDS_KEY = 'sp_ootd_records'
const MIGRATE_PER_FLUSH = 3

export type PostOp = 'publish' | 'private' | 'delete'
export interface PostJob {
  recordId: string
  op: PostOp
  postId?: string | null        // delete 는 기록이 이미 없으므로 여기 들고 있는다
  visibility?: 'public' | 'friends'
  ts: number
  tries: number
  lastError?: string
}

interface RecordLike {
  id: string; date: string; colors: Record<string, string | null>; photos: string[]; score: number
  memo: string; visibility: 'private' | 'friends' | 'public'; showInstagram: boolean; postId: string | null
}

// ── 저장소 ──
let queue: PostJob[] = getJSON<PostJob[]>(QUEUE_KEY, [])
let pendingSet = new Set(queue.map(j => j.recordId))
const listeners = new Set<() => void>()
function persist() {
  try { setJSON(QUEUE_KEY, queue) } catch {}
  pendingSet = new Set(queue.map(j => j.recordId))
  listeners.forEach(l => l())
}
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
function snapshot() { return pendingSet }

let userId: string | null = null
let flushing = false
let hooked = false

function readRecords(): RecordLike[] { return getJSON<RecordLike[]>(RECORDS_KEY, []) }
function writeRecords(recs: RecordLike[]) { setJSON(RECORDS_KEY, recs) }
function patchRecord(id: string, patch: Partial<RecordLike>) {
  const recs = readRecords()
  const i = recs.findIndex(r => r.id === id)
  if (i < 0) return null
  recs[i] = { ...recs[i], ...patch }
  writeRecords(recs)
  return recs[i]
}

// ── 공개 API ──
export function enqueuePost(job: Omit<PostJob, 'ts' | 'tries'>) {
  // 같은 기록의 이전 작업은 새 작업이 대체한다 (publish → private → publish …)
  queue = queue.filter(j => j.recordId !== job.recordId)
  queue.push({ ...job, ts: Date.now(), tries: 0 })
  persist()
  void flushPostQueue()
}

export function isPostPending(recordId: string) { return pendingSet.has(recordId) }
export function pendingJob(recordId: string) { return queue.find(j => j.recordId === recordId) }

/** App 루트에서: 로그인 사용자와 묶고 재개/온라인 훅을 건다 */
export function bindPostQueueUser(uid: string | null) {
  userId = uid
  if (!hooked) {
    hooked = true
    onAppResume(() => { void flushPostQueue() })
    onNetworkChange(o => { if (o) void flushPostQueue() })
  }
  if (uid) void flushPostQueue()
}

function backoffMs(tries: number) { return Math.min(60 * 60_000, 15_000 * 2 ** Math.min(tries, 8)) }

/** 큐 처리. 동시에 한 번만 돈다. */
export async function flushPostQueue(force = false): Promise<void> {
  if (flushing || !userId || !isOnline()) return
  flushing = true
  const uid = userId
  try {
    for (const job of [...queue]) {
      if (userId !== uid) break
      if (!force && job.tries > 0 && Date.now() - job.ts < backoffMs(job.tries)) continue
      try {
        await runJob(uid, job)
        queue = queue.filter(j => j !== job)
      } catch (e) {
        job.tries += 1; job.ts = Date.now(); job.lastError = (e as Error)?.message || String(e)
        console.warn('[postQueue] job failed:', job.op, job.recordId, job.lastError)
      }
      persist()
    }
    await migrateLegacyPhotos(uid)
  } finally {
    flushing = false
  }
}

async function ensurePhotoUrls(uid: string, rec: RecordLike): Promise<string[]> {
  if (!rec.photos?.some(isDataUrl)) return rec.photos || []
  const urls = await uploadPhotos(uid, rec.photos)
  patchRecord(rec.id, { photos: urls })
  return urls
}

async function runJob(uid: string, job: PostJob) {
  if (job.op === 'delete') {
    if (!job.postId) return
    const { error } = await supabase.from('posts').delete().eq('id', job.postId).eq('user_id', uid)
    if (error) throw error
    return
  }
  const rec = readRecords().find(r => r.id === job.recordId)
  if (!rec) return // 기록이 사라졌으면 할 일 없음
  if (job.op === 'private') {
    if (!rec.postId) return
    const { error } = await supabase.from('posts').update({ visibility: 'private' }).eq('id', rec.postId).eq('user_id', uid)
    if (error) throw error
    return
  }
  // publish
  const photos = await ensurePhotoUrls(uid, rec)
  const outfit: Record<string, string> = {}
  Object.entries(rec.colors || {}).forEach(([k, v]) => { if (v) outfit[k] = v })
  const visibility = job.visibility || (rec.visibility === 'private' ? 'public' : rec.visibility)
  const body = {
    outfit, score: rec.score,
    caption: rec.memo?.slice(0, 200) || null,
    photo_urls: photos.length > 0 ? photos : null,
    visibility, show_instagram: !!rec.showInstagram,
  }
  if (rec.postId) {
    const { error } = await supabase.from('posts').update(body).eq('id', rec.postId).eq('user_id', uid)
    if (error) throw error
    patchRecord(rec.id, { visibility })
  } else {
    const { data, error } = await supabase.from('posts').insert({
      user_id: uid,
      title: rec.memo?.slice(0, 100) || i18n.t('ootdDetail.todaysCoord'),
      style: null, layer_type: 'basic', status: 'approved', hide_counts: false,
      ...body,
    }).select('id').single()
    if (error) throw error
    patchRecord(rec.id, { postId: data.id, visibility })
  }
}

/** 옛 기록의 base64 사진을 조금씩 Storage 로 옮긴다 (한 번에 3건). 게시된 기록은 posts.photo_urls 도 갱신 */
async function migrateLegacyPhotos(uid: string) {
  const recs = readRecords().filter(r => r.photos?.some(isDataUrl)).slice(0, MIGRATE_PER_FLUSH)
  for (const rec of recs) {
    if (userId !== uid) return
    try {
      const urls = await uploadPhotos(uid, rec.photos)
      patchRecord(rec.id, { photos: urls })
      if (rec.postId) await supabase.from('posts').update({ photo_urls: urls }).eq('id', rec.postId).eq('user_id', uid)
    } catch (e) {
      console.warn('[postQueue] photo migration failed:', rec.id, e)
      return // 네트워크 문제면 다음 flush 에서
    }
  }
}

/** 게시 대기 중인 기록 id 집합 */
export function usePostQueue() {
  const pending = useSyncExternalStore(subscribe, snapshot, snapshot)
  return { pending, isPending: (id: string) => pending.has(id), retry: () => flushPostQueue(true) }
}
