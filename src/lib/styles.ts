// @ts-nocheck
// ================================================================
// styles.ts — 20가지 스타일 가이드 + 무드 그룹 + 레이어 레벨
// 원본: 바루픽_최신본.html 2521~2649행
// ================================================================

export const STYLE_GUIDE: Record<string, { name: string; subtitle: string; mood: string; keywords: string[]; layers: Record<string, any> }> = {
  preppy: { name: "프레피 룩", subtitle: "아이비리그 명문대의 단정한 세련미", mood: "semi_formal", keywords: ["니트 베스트", "옥스퍼드 셔츠", "치노 팬츠", "로퍼"], layers: {} },
  ivy: { name: "아이비 룩", subtitle: "정통 미국 동부 캠퍼스 스타일", mood: "semi_formal", keywords: ["블레이저", "버튼다운 셔츠", "로퍼"], layers: {} },
  dandy: { name: "댄디 룩", subtitle: "신사의 품격, 세련된 어른의 스타일", mood: "semi_formal", keywords: ["울 코트", "터틀넥", "첼시부츠"], layers: {} },
  oldmoney: { name: "올드머니 룩", subtitle: "조용한 고급스러움의 정석", mood: "semi_formal", keywords: ["캐시미어", "코듀로이", "로퍼"], layers: {} },
  ralphlook: { name: "랄뽕", subtitle: "랄프 로렌으로 완성하는 아메리칸 트래디셔널", mood: "semi_formal", keywords: ["폴로 셔츠", "케이블 니트", "치노"], layers: {} },
  minimal: { name: "미니멀 룩", subtitle: "최소한의 요소로 최대한의 세련미", mood: "casual", keywords: ["무지 티", "와이드 팬츠", "미니멀 스니커즈"], layers: {} },
  casual: { name: "캐주얼 룩", subtitle: "편안하면서도 센스 있는 일상 코디", mood: "casual", keywords: ["맨투맨", "청바지", "스니커즈"], layers: {} },
  cityboy: { name: "시티보이 룩", subtitle: "도시의 자유로움, 내추럴 파스텔", mood: "casual", keywords: ["오버핏 셔츠", "와이드 팬츠", "뉴발란스"], layers: {} },
  normcore: { name: "놈코어", subtitle: "의도적으로 평범하게, 힘 빼기의 미학", mood: "casual", keywords: ["무지 티", "일자 청바지", "아디다스"], layers: {} },
  athleisure: { name: "애슬레저", subtitle: "운동복과 일상복의 경계를 넘다", mood: "casual", keywords: ["조거팬츠", "후드집업", "러닝화"], layers: {} },
  amekaji: { name: "아메카지", subtitle: "데님과 워크부츠의 빈티지 감성", mood: "work_outdoor", keywords: ["데님 자켓", "워크부츠", "체크셔츠"], layers: {} },
  workwear: { name: "워크웨어", subtitle: "실용적인 노동자의 미학", mood: "work_outdoor", keywords: ["카버올", "워크팬츠", "부츠"], layers: {} },
  military: { name: "밀리터리 룩", subtitle: "군복에서 영감받은 강인한 스타일", mood: "work_outdoor", keywords: ["MA-1 자켓", "카고팬츠", "컴뱃부츠"], layers: {} },
  british: { name: "브리티시 헤리티지", subtitle: "영국 시골의 품격 있는 아웃도어", mood: "work_outdoor", keywords: ["바버 재킷", "트위드", "첼시부츠"], layers: {} },
  gorpcore: { name: "그래놀라/고프코어", subtitle: "아웃도어 브랜드를 도시에서 즐기다", mood: "work_outdoor", keywords: ["플리스", "트레킹화", "카고팬츠"], layers: {} },
  street: { name: "스트릿 룩", subtitle: "힙합과 스케이트보드 문화에서 온 자유", mood: "street", keywords: ["후드티", "카고팬츠", "하이탑"], layers: {} },
  grunge: { name: "그런지 룩", subtitle: "90년대 얼터너티브 록의 반항", mood: "street", keywords: ["체크 플란넬", "찢어진 진", "닥터마틴"], layers: {} },
  contemporary: { name: "컨템포러리 룩", subtitle: "도시적 실험, 모던 아방가르드", mood: "street", keywords: ["구조적 재킷", "비대칭 컷", "모노톤"], layers: {} },
  techwear: { name: "테크웨어", subtitle: "기능성 소재의 도시적 미래감", mood: "street", keywords: ["고어텍스", "카고팬츠", "테크 러너"], layers: {} },
  genderless: { name: "젠더리스", subtitle: "성별의 경계를 넘는 자유로운 스타일", mood: "street", keywords: ["오버사이즈 셔츠", "와이드 팬츠", "유니섹스"], layers: {} }
}

export const MOOD_GROUPS: Record<string, { name: string; icon: string; description: string; styles: string[] }> = {
  "semi_formal": {
      "name": "세미포멀",
      "icon": "👔",
      "description": "격식과 세련미를 갖춘 스타일",
      "styles": [
          "preppy",
          "ivy",
          "dandy",
          "oldmoney",
          "ralphlook"
      ]
  },
  "casual": {
      "name": "캐주얼",
      "icon": "👕",
      "description": "편안하면서 센스 있는 일상 스타일",
      "styles": [
          "minimal",
          "casual",
          "cityboy",
          "normcore",
          "athleisure"
      ]
  },
  "work_outdoor": {
      "name": "워크·아웃도어",
      "icon": "🥾",
      "description": "실용적이고 거친 매력의 스타일",
      "styles": [
          "amekaji",
          "workwear",
          "military",
          "british",
          "gorpcore"
      ]
  },
  "street": {
      "name": "스트릿",
      "icon": "🧢",
      "description": "자유롭고 개성 넘치는 거리 문화",
      "styles": [
          "street",
          "grunge",
          "contemporary",
          "techwear",
          "genderless"
      ]
  }
}

export const LAYER_LEVELS: Record<string, { name: string; parts: string[]; partKeys: string[] }> = {
  "simple": {
      "name": "심플",
      "parts": ["상의", "하의", "신발"],
      "partKeys": ["top", "bottom", "shoes"],
      "count": 3
  },
  "basic": {
      "name": "아우터 + 이너",
      "parts": ["아우터", "이너", "하의", "신발"],
      "partKeys": ["outer", "top", "bottom", "shoes"],
      "count": 4
  },
  "mid_inner": {
      "name": "미들웨어 + 이너",
      "parts": ["미들웨어", "이너", "하의", "신발"],
      "partKeys": ["middleware", "top", "bottom", "shoes"],
      "count": 4
  },
  "scarf_top": {
      "name": "목도리 + 상의",
      "parts": ["목도리", "상의", "하의", "신발"],
      "partKeys": ["scarf", "top", "bottom", "shoes"],
      "count": 4
  },
  "layered": {
      "name": "아우터 + 미들웨어 + 이너",
      "parts": ["아우터", "미들웨어", "이너", "하의", "신발"],
      "partKeys": ["outer", "middleware", "top", "bottom", "shoes"],
      "count": 5
  },
  "scarf_basic": {
      "name": "목도리 + 아우터 + 이너",
      "parts": ["목도리", "아우터", "이너", "하의", "신발"],
      "partKeys": ["scarf", "outer", "top", "bottom", "shoes"],
      "count": 5
  },
  "scarf_mid": {
      "name": "목도리 + 미들웨어 + 이너",
      "parts": ["목도리", "미들웨어", "이너", "하의", "신발"],
      "partKeys": ["scarf", "middleware", "top", "bottom", "shoes"],
      "count": 5
  },
  "full": {
      "name": "풀 레이어드",
      "parts": ["목도리", "아우터", "미들웨어", "이너", "하의", "신발"],
      "partKeys": ["scarf", "outer", "middleware", "top", "bottom", "shoes"],
      "count": 6
  }
}

export const STYLE_ICONS = { preppy: '🏫', ivy: '🎓', dandy: '🎩', oldmoney: '💎', ralphlook: '🐎', minimal: '◻️', casual: '👟', cityboy: '🌿', normcore: '🤍', athleisure: '🏃', amekaji: '👖', workwear: '🔧', military: '🪖', british: '🧥', gorpcore: '⛰️', street: '🛹', grunge: '🎸', contemporary: '🖤', techwear: '⚡', genderless: '🌈' };
// New layers data (mid_inner, scarf_top, scarf_basic, scarf_mid)
