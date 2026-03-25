#!/usr/bin/env node
/**
 * Apple Sign In — Client Secret JWT 생성기
 *
 * 사용법:
 *   node scripts/generate-apple-secret.mjs
 *
 * 필요한 것:
 *   1. Apple Developer에서 발급받은 .p8 키 파일
 *   2. Key ID (.p8 발급 시 확인 가능)
 *   3. Team ID (Apple Developer 우측 상단에 표시)
 *   4. Service ID (com.barusa.barupick.web)
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

// ═══════════════════════════════════════
// ▼▼▼ 여기에 값을 입력하세요 ▼▼▼
// ═══════════════════════════════════════

const TEAM_ID = '6K46PNWCCH'                    // Apple Developer 팀 ID
const KEY_ID = 'YOUR_KEY_ID_HERE'                // .p8 키 ID (Apple Developer → Keys에서 확인)
const SERVICE_ID = 'com.barusa.barupick.web'     // Apple Service ID
const P8_FILE_PATH = './AuthKey_XXXXXXXX.p8'     // .p8 파일 경로 (이 스크립트와 같은 폴더에 두기)

// ═══════════════════════════════════════
// ▲▲▲ 여기에 값을 입력하세요 ▲▲▲
// ═══════════════════════════════════════

function generateAppleClientSecret() {
  // .p8 파일 읽기
  let privateKey
  try {
    privateKey = fs.readFileSync(path.resolve(P8_FILE_PATH), 'utf8')
  } catch (e) {
    console.error(`\n❌ .p8 파일을 찾을 수 없습니다: ${P8_FILE_PATH}`)
    console.error(`   .p8 파일을 이 스크립트와 같은 폴더에 넣어주세요.\n`)
    process.exit(1)
  }

  if (KEY_ID === 'YOUR_KEY_ID_HERE') {
    console.error('\n❌ KEY_ID를 입력해주세요!')
    console.error('   Apple Developer → Certificates, Identifiers & Profiles → Keys에서 확인\n')
    process.exit(1)
  }

  // JWT 헤더
  const header = {
    alg: 'ES256',
    kid: KEY_ID,
  }

  // JWT 페이로드 (6개월 유효)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: TEAM_ID,
    iat: now,
    exp: now + (86400 * 180), // 180일 (약 6개월)
    aud: 'https://appleid.apple.com',
    sub: SERVICE_ID,
  }

  // Base64url 인코딩
  const base64url = (obj) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')

  const headerB64 = base64url(header)
  const payloadB64 = base64url(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  // ES256 서명
  const sign = crypto.createSign('SHA256')
  sign.update(signingInput)
  const signature = sign
    .sign({ key: privateKey, dsaEncoding: 'ieee-p1363' })
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  const jwt = `${signingInput}.${signature}`

  console.log('\n✅ Apple Client Secret JWT 생성 완료!\n')
  console.log('━'.repeat(60))
  console.log(jwt)
  console.log('━'.repeat(60))
  console.log('\n📋 위 JWT를 복사해서 Supabase → Apple → Secret Key에 붙여넣으세요.')
  console.log(`⏰ 만료일: ${new Date((now + 86400 * 180) * 1000).toLocaleDateString('ko-KR')}`)
  console.log('   (6개월 후 이 스크립트를 다시 실행해서 갱신하세요)')
  console.log('')
  console.log('⚠️  Supabase Apple 프로바이더 필수 설정:')
  console.log('   Supabase Dashboard → Authentication → Providers → Apple')
  console.log('   - Client ID (for web):       com.barusa.barupick.web')
  console.log('   - Authorized Client IDs:     kr.co.barusa.barupick')
  console.log('   (iOS 네이티브 Apple 로그인은 번들 ID가 id_token의 aud로 설정됩니다)')
  console.log('')

  return jwt
}

generateAppleClientSecret()
