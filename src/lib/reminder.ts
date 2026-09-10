// ================================================================
// reminder.ts — 저녁 8시 날씨 알림 (루프 L5)
//
// 날씨가 바뀌는 날에만 온다(내일 아침 체감이 오늘보다 5° 이상 다르거나 비 확률 50% 이상).
// 알림을 열면 만들기 1단계(내일의 한 벌)로 간다. 매일 오는 알림은 꺼지므로 조건부로만.
// iOS 앱: Capacitor LocalNotifications 로 기기 안에서 예약 (서버 없음). 앱을 열 때마다
// 오늘 20시 알림을 내일 예보로 다시 잡는다. 웹: 알림 권한이 있고 탭이 열려 있을 때만
// 서비스 워커로 띄운다(웹 푸시 서버는 아직 없다).
// ================================================================
import { Capacitor } from '@capacitor/core'
import i18n from '@/i18n'
import { trackEvent } from './analytics'
import type { WeatherData } from '@/hooks/useWeather'

const ON_KEY = 'sp_reminder'          // '1' | '0' (기본 켬)
const LAST_KEY = 'sp_reminder_last'   // 마지막으로 잡은 날 (YYYY-MM-DD)
const ID = 1001
const HOUR = 20
export const ROUTE = '/home/build'

export const reminderOn = () => { try { return localStorage.getItem(ON_KEY) !== '0' } catch { return true } }
export function setReminderOn(on: boolean) { try { localStorage.setItem(ON_KEY, on ? '1' : '0') } catch {} }
export const isNative = () => Capacitor.isNativePlatform()

export interface ReminderText { title: string; body: string; kind: 'colder' | 'warmer' | 'rain' }
/** 알림 문구. 날씨가 안 바뀌는 날이면 null */
export function reminderText(w: WeatherData): ReminderText | null {
  const tm = w.tomorrow; if (!tm) return null
  const t = i18n.t.bind(i18n)
  const diff = tm.feels - tm.todayMin
  if (tm.rain >= 50) return { kind: 'rain', title: t('reminder.rainTitle', { p: tm.rain, temp: tm.feels }), body: t('reminder.rainBody') }
  if (diff <= -5) return { kind: 'colder', title: t('reminder.colderTitle', { temp: tm.feels, d: -diff }), body: t('reminder.colderBody') }
  if (diff >= 5) return { kind: 'warmer', title: t('reminder.warmerTitle', { temp: tm.feels, d: diff }), body: t('reminder.warmerBody') }
  return null
}

function at20(): Date | null {
  const d = new Date(); d.setHours(HOUR, 0, 0, 0)
  return d.getTime() - Date.now() > 5 * 60 * 1000 ? d : null   // 이미 지났거나 5분 안이면 오늘은 없다
}
const today = () => new Date().toISOString().slice(0, 10)

/** 권한 요청 (설정 토글에서). 허용이면 true */
export async function requestReminderPermission(): Promise<boolean> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const r = await LocalNotifications.requestPermissions()
      return r.display === 'granted'
    }
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    return (await Notification.requestPermission()) === 'granted'
  } catch { return false }
}

let webTimer: number | null = null

/** 오늘 저녁 알림을 (다시) 잡는다. 앱을 열 때·날씨가 갱신될 때 부른다 */
export async function scheduleReminder(w: WeatherData | null): Promise<void> {
  try {
    if (isNative()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.cancel({ notifications: [{ id: ID }] }).catch(() => {})
      if (!reminderOn() || !w) return
      const txt = reminderText(w); const when = at20()
      if (!txt || !when) return
      const perm = await LocalNotifications.checkPermissions()
      if (perm.display !== 'granted') return
      await LocalNotifications.schedule({ notifications: [{ id: ID, title: txt.title, body: txt.body, schedule: { at: when }, extra: { route: ROUTE, kind: txt.kind } }] })
      if (localStorage.getItem(LAST_KEY) !== today()) { localStorage.setItem(LAST_KEY, today()); trackEvent('reminder_schedule', { kind: txt.kind, native: true }) }
      return
    }
    // 웹: 탭이 열려 있을 때만
    if (webTimer) { clearTimeout(webTimer); webTimer = null }
    if (!reminderOn() || !w || typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const txt = reminderText(w); const when = at20()
    if (!txt || !when) return
    webTimer = window.setTimeout(async () => {
      try {
        const reg = await navigator.serviceWorker?.getRegistration()
        if (reg) await reg.showNotification(txt.title, { body: txt.body, icon: '/icons/icon-192.png', data: { route: ROUTE }, tag: 'bp-reminder' })
        else new Notification(txt.title, { body: txt.body })
        trackEvent('reminder_show', { kind: txt.kind, native: false })
      } catch {}
    }, when.getTime() - Date.now())
    if (localStorage.getItem(LAST_KEY) !== today()) { localStorage.setItem(LAST_KEY, today()); trackEvent('reminder_schedule', { kind: txt.kind, native: false }) }
  } catch {}
}

/** 알림을 눌러 앱이 열렸을 때 → 만들기로. 한 번만 건다 */
let hooked = false
export async function initReminderTap(navigate: (to: string) => void) {
  if (hooked || !isNative()) return
  hooked = true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.addListener('localNotificationActionPerformed', e => {
      const route = (e.notification.extra && e.notification.extra.route) || ROUTE
      trackEvent('reminder_open', { kind: e.notification.extra?.kind })
      navigate(route)
    })
  } catch {}
}
