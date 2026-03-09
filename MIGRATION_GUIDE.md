# 바루픽 프로덕션 전환 가이드
# barupick (HTML) → barupick (React) 교체

## 개요
기존 github.com/ilu95/barupick 레포의 HTML 단일 파일을 React로 교체합니다.
- 기존 Vercel 프로젝트(barupick.vercel.app) 유지
- 기존 프로덕션 DB(kwcogjzwpnvqwmifizce) 유지
- Google Play 심사 URL 변경 없음
- 기존 유저 데이터(localStorage) 자동 마이그레이션

---

## STEP 1: Supabase 프로덕션 DB 준비 (5분)

### 1-1. 스키마 확인/적용
Supabase Dashboard → 프로젝트 kwcogjzwpnvqwmifizce → SQL Editor

```
-- 이미 테이블이 있는지 확인
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

profiles, posts, comments, likes, saves, follows, blocks, notifications, events, event_submissions 
테이블이 모두 있으면 SKIP. 없으면 `scripts/01_schema.sql` 실행.

### 1-2. Storage RLS 정책
SQL Editor에서 `scripts/02_storage_rls.sql` 실행 (DROP IF EXISTS 포함이라 안전)

### 1-3. Storage 버킷 확인
Supabase Dashboard → Storage → avatars, community 버킷이 있는지 확인
없으면 SQL Editor에서:
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('community', 'community', true) ON CONFLICT DO NOTHING;
```

### 1-4. Auth Redirect URL 추가
Supabase Dashboard → Authentication → URL Configuration → Redirect URLs에 추가:
```
https://barupick.vercel.app
https://barupick.vercel.app/**
```

---

## STEP 2: GitHub 레포 교체 (10분)

### ⚠️ 중요: 기존 코드 백업
```bash
cd ~
git clone https://github.com/ilu95/barupick.git barupick-backup
```

### 레포 교체
```bash
# 1. 기존 레포 클론 (이미 있으면 pull)
git clone https://github.com/ilu95/barupick.git
cd barupick

# 2. 기존 파일 전부 삭제 (.git 제외)
git rm -rf .
git clean -fd

# 3. 새 React 코드 복사
#    (이 zip의 내용물을 barupick/ 폴더에 복사)
#    node_modules, dist 폴더는 제외

# 4. 커밋 & 푸시
git add -A
git commit -m "chore: migrate to React (Vite + React 18 + TypeScript + Tailwind)"
git push origin main
```

또는 간단하게:
```bash
# 기존 레포 폴더에서
rm -rf * .*  # .git 제외 수동 삭제 주의!
# 새 파일 복사 후
git add -A && git commit -m "migrate to React" && git push
```

---

## STEP 3: Vercel 환경변수 설정 (3분)

Vercel Dashboard → barupick 프로젝트 → Settings → Environment Variables

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://kwcogjzwpnvqwmifizce.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | (프로덕션 anon key — Supabase Dashboard → Settings → API에서 복사) |

⚠️ Environment: Production + Preview + Development 모두 체크

---

## STEP 4: Vercel 빌드 설정 확인 (2분)

Vercel Dashboard → barupick 프로젝트 → Settings → General

- **Framework Preset**: Vite (자동 감지됨)
- **Build Command**: `npm run build` (vercel.json에 이미 설정)
- **Output Directory**: `dist` (vercel.json에 이미 설정)
- **Install Command**: `npm install` (기본값)

설정 변경 후 → Deployments → 최근 배포 → ... → Redeploy 클릭

---

## STEP 5: 배포 확인 (5분)

### 5-1. 기본 동작 확인
- [ ] https://barupick.vercel.app 접속 → 온보딩 또는 홈 화면 표시
- [ ] 스타일 적용됨 (Tailwind 컬러, 폰트, 그림자 정상)
- [ ] 하단 네비게이션 바 표시

### 5-2. 핵심 기능 확인
- [ ] 코디 추천받기 → 무드/스타일 선택 → 결과 표시 (50점 아닌 실제 점수)
- [ ] 직접 만들기 → 색상 추천 표시
- [ ] OOTD 기록 → 사진 4:5 크롭 동작
- [ ] 프로필 → 아바타 원형 크롭 동작
- [ ] 설정 → 다크 모드 토글

### 5-3. DB 연결 확인
- [ ] 로그인/회원가입 동작
- [ ] 커뮤니티 게시물 로드

### 5-4. PWA 확인
- [ ] Android: "홈 화면에 추가" 동작
- [ ] /.well-known/assetlinks.json 접속 가능 (Android App Links)
- [ ] /delete-account.html 접속 가능 (Google Play 필수)

### 5-5. 기존 유저 데이터
- [ ] 기존 OOTD 기록 유지 (localStorage)
- [ ] 기존 옷장 아이템 유지

---

## 롤백 방법

문제 발생 시 기존 HTML 버전으로 즉시 롤백:
```bash
cd barupick
git revert HEAD
git push origin main
```
또는 Vercel Dashboard → Deployments → 이전 배포 → ... → Promote to Production

---

## 파일 구조 (교체 후)

```
barupick/
├── public/                 # 정적 파일 (빌드 시 dist/에 복사)
│   ├── .well-known/        # Android App Links (★ Google Play 필수)
│   ├── icons/              # PWA 아이콘
│   ├── delete-account.html # 계정 삭제 페이지 (★ Google Play 필수)
│   ├── bridge.html         # 카운트다운 페이지
│   ├── manifest.json       # PWA 매니페스트
│   ├── sw.js               # 서비스 워커
│   ├── favicon.png
│   ├── apple-touch-icon-*.png
│   └── splash-*.png
├── src/                    # React 소스
│   ├── pages/              # 29개 페이지
│   ├── components/         # 9개 컴포넌트
│   ├── hooks/              # 8개 훅
│   ├── lib/                # 11개 라이브러리
│   ├── contexts/           # Auth 컨텍스트
│   ├── App.tsx             # 라우터 (50개 라우트)
│   ├── main.tsx            # 엔트리 + localStorage 마이그레이션
│   └── index.css           # Tailwind + 다크모드 + 애니메이션
├── scripts/                # DB 스키마 SQL
├── index.html              # Vite 엔트리 (PWA 메타 포함)
├── vercel.json             # Vercel 배포 설정
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```
