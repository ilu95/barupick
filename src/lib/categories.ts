// @ts-nocheck
// ================================================================
// categories.ts — 카테고리 이름 + 파트 아이콘 + 소재 데이터
// 원본: 바루픽_최신본.html 6161~6403행
// ================================================================

export const CATEGORY_NAMES = {
    outer: '아우터', middleware: '미들웨어', top: '상의',
    bottom: '하의', scarf: '목도리', hat: '모자', shoes: '신발'
};

export const PART_ICONS = {
    outer: '🧥', middleware: '🧶', top: '👔',
    bottom: '👖', scarf: '🧣', hat: '🎩', shoes: '👟'
};

// 의류 부위 전용 SVG 아이콘 (Lucide 스타일: stroke-based, round caps, 24x24)
export function partSvg(part, size, color) {
    const s = size || 20;
    const c = color || 'currentColor';
    const sw = '1.8';
    const paths = {
        top: `<path d="M12 3l-4 4H4v3l2 1.5V21h12V11.5L20 10V7h-4L12 3z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 3c0 2 1 3 2 3s2-1 2-3" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`,
        bottom: `<path d="M7 3h10l1 10-3 8h-2l-1-7-1 7h-2L6 13z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="3" x2="12" y2="14" stroke="${c}" stroke-width="1.2" stroke-linecap="round"/>`,
        outer: `<path d="M12 2L7 6H3v4l2 1.5V22h14V11.5L21 10V6h-4L12 2z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="6" x2="9" y2="22" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.35"/><line x1="15" y1="6" x2="15" y2="22" stroke="${c}" stroke-width="1" stroke-linecap="round" opacity="0.35"/>`,
        middleware: `<path d="M8 3h8v3c0 1.5-1.5 2.5-4 2.5S8 7.5 8 6V3z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9h12v12H6z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" rx="1"/><path d="M6 9c0-1 1-2 2-2h8c1 0 2 1 2 2" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`,
        scarf: `<path d="M8 4c1 2 3 3 4 3s3-1 4-3" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/><path d="M8 4c-2 2-3 5-3 8v4c0 1 .5 2 2 2h2l1-4" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 4c2 2 3 5 3 8v1h-4v5c0 1 .5 2 2 2" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
        hat: `<ellipse cx="12" cy="17" rx="9" ry="2.5" fill="none" stroke="${c}" stroke-width="${sw}"/><path d="M7.5 17c.5-5 2-9 4.5-9s4 4 4.5 9" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`,
        shoes: `<path d="M4 16c0-2 2-3 4-3h3l4 .5c3 .5 5 1.5 5 3v1c0 1-1 2-3 2H7c-2 0-3-1-3-2v-1.5z" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13V9c0-1.5 1-2.5 2.5-2.5" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`
    };
    const p = paths[part] || paths.top;
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle">${p}</svg>`;
}

// ============================================================
// 소재/아이템 가이드 데이터
// ============================================================
export const FABRIC_SEASONS = {
    spring: { name: '봄', emoji: '🌸' },
    summer: { name: '여름', emoji: '☀️' },
    fall:   { name: '가을', emoji: '🍂' },
    winter: { name: '겨울', emoji: '❄️' }
};

// 부위별 아이템+소재 목록
export const FABRIC_ITEMS = {
    outer: [
        { id: 'leather_jacket',  name: '가죽 자켓',    icon: '🧥', tags: ['leather'],         desc: '소가죽·양가죽 라이더/블루종', seasons: ['spring','fall'] },
        { id: 'denim_jacket',    name: '데님 자켓',    icon: '🧥', tags: ['denim'],           desc: '청자켓, 트러커 자켓',        seasons: ['spring','fall'] },
        { id: 'wool_coat',       name: '울 코트',      icon: '🧥', tags: ['wool','woven'],    desc: '싱글·더블 울 코트',          seasons: ['fall','winter'] },
        { id: 'padding',         name: '패딩',         icon: '🧥', tags: ['nylon','padding'], desc: '구스다운·폴리 패딩',         seasons: ['winter'] },
        { id: 'fleece_jacket',   name: '플리스 자켓',  icon: '🧥', tags: ['fleece','synthetic'], desc: '양털·보아 플리스',        seasons: ['fall','winter'] },
        { id: 'cotton_jacket',   name: '면 자켓',      icon: '🧥', tags: ['cotton','woven'],  desc: '치노·코튼 블레이저',         seasons: ['spring','fall'] },
        { id: 'nylon_jacket',    name: '나일론 자켓',  icon: '🧥', tags: ['nylon','synthetic'], desc: '윈드브레이커·코치자켓',    seasons: ['spring','summer','fall'] },
        { id: 'linen_jacket',    name: '린넨 자켓',    icon: '🧥', tags: ['linen','woven'],   desc: '린넨·마 블레이저',           seasons: ['spring','summer'] },
        { id: 'tweed_jacket',    name: '트위드 자켓',  icon: '🧥', tags: ['wool','tweed','woven'], desc: '트위드 블레이저',        seasons: ['fall','winter'] },
        { id: 'suede_jacket',    name: '스웨이드 자켓', icon: '🧥', tags: ['suede'],          desc: '스웨이드 블루종·자켓',       seasons: ['spring','fall'] },
        { id: 'waxed_jacket',    name: '왁스드 자켓',  icon: '🧥', tags: ['waxed','cotton'],  desc: '바버·오일드 자켓',           seasons: ['fall','winter'] },
    ],
    middleware: [
        { id: 'wool_knit',       name: '울 니트',      icon: '🧶', tags: ['wool','knit'],     desc: '램스울·메리노 울 니트',      seasons: ['fall','winter'] },
        { id: 'cotton_knit',     name: '면 니트',      icon: '🧶', tags: ['cotton','knit'],   desc: '코튼 니트·가디건',           seasons: ['spring','fall'] },
        { id: 'cashmere_knit',   name: '캐시미어 니트', icon: '🧶', tags: ['cashmere','knit'], desc: '캐시미어 풀오버',           seasons: ['fall','winter'] },
        { id: 'fleece_mid',      name: '플리스',       icon: '🧶', tags: ['fleece','synthetic'], desc: '미드레이어 플리스',       seasons: ['fall','winter'] },
        { id: 'cardigan_wool',   name: '울 가디건',    icon: '🧶', tags: ['wool','knit'],     desc: '울 가디건·숄카라',           seasons: ['fall','winter'] },
        { id: 'vest_padding',    name: '패딩 조끼',    icon: '🧶', tags: ['nylon','padding'], desc: '경량 패딩 베스트',           seasons: ['fall','winter'] },
        { id: 'vest_knit',       name: '니트 조끼',    icon: '🧶', tags: ['wool','knit'],     desc: '니트 베스트·스웨터 조끼',    seasons: ['spring','fall','winter'] },
        { id: 'hoodie',          name: '후드 집업',    icon: '🧶', tags: ['cotton','jersey'], desc: '코튼·기모 후드 집업',        seasons: ['spring','fall','winter'] },
        { id: 'sweatshirt_mid',  name: '맨투맨',       icon: '🧶', tags: ['cotton','jersey'], desc: '미들레이어용 맨투맨',        seasons: ['spring','fall'] },
    ],
    top: [
        { id: 'cotton_tee',      name: '면 티셔츠',    icon: '👔', tags: ['cotton','jersey'], desc: '코튼 라운드·브이넥',         seasons: ['spring','summer','fall'] },
        { id: 'oxford_shirt',    name: '옥스퍼드 셔츠', icon: '👔', tags: ['cotton','woven'], desc: '옥스퍼드 BD 셔츠',          seasons: ['spring','summer','fall'] },
        { id: 'linen_shirt',     name: '린넨 셔츠',    icon: '👔', tags: ['linen','woven'],   desc: '린넨·마 셔츠',               seasons: ['spring','summer'] },
        { id: 'flannel_shirt',   name: '플란넬 셔츠',  icon: '👔', tags: ['cotton','flannel','woven'], desc: '기모 체크 셔츠',    seasons: ['fall','winter'] },
        { id: 'denim_shirt',     name: '데님 셔츠',    icon: '👔', tags: ['denim','woven'],   desc: '샴브레이·데님 셔츠',         seasons: ['spring','fall'] },
        { id: 'silk_blouse',     name: '실크 블라우스', icon: '👔', tags: ['silk','woven'],    desc: '실크·새틴 블라우스',         seasons: ['spring','summer','fall'] },
        { id: 'polo_shirt',      name: '폴로 셔츠',    icon: '👔', tags: ['cotton','pique'],  desc: '피케 폴로 셔츠',             seasons: ['spring','summer'] },
        { id: 'turtleneck',      name: '터틀넥',       icon: '👔', tags: ['cotton','jersey'], desc: '코튼·모달 터틀넥',           seasons: ['fall','winter'] },
        { id: 'wool_turtleneck', name: '울 터틀넥',    icon: '👔', tags: ['wool','knit'],     desc: '울 터틀넥 니트',             seasons: ['fall','winter'] },
        { id: 'henley',          name: '헨리넥',       icon: '👔', tags: ['cotton','jersey'], desc: '와플·서멀 헨리넥',           seasons: ['spring','fall'] },
    ],
    bottom: [
        { id: 'raw_denim',       name: '데님 진',      icon: '👖', tags: ['denim'],           desc: '스트레이트·슬림 데님',       seasons: ['spring','summer','fall','winter'] },
        { id: 'chino',           name: '치노 팬츠',    icon: '👖', tags: ['cotton','woven','chino'], desc: '코튼 치노 팬츠',      seasons: ['spring','summer','fall'] },
        { id: 'wool_slacks',     name: '울 슬랙스',    icon: '👖', tags: ['wool','woven'],    desc: '울 드레스 팬츠',             seasons: ['fall','winter'] },
        { id: 'linen_pants',     name: '린넨 팬츠',    icon: '👖', tags: ['linen','woven'],   desc: '린넨 와이드·스트레이트',     seasons: ['spring','summer'] },
        { id: 'corduroy',        name: '코듀로이',     icon: '👖', tags: ['cotton','corduroy'], desc: '골덴 팬츠',               seasons: ['fall','winter'] },
        { id: 'cotton_shorts',   name: '면 반바지',    icon: '👖', tags: ['cotton','woven'],  desc: '치노·카고 쇼츠',             seasons: ['summer'] },
        { id: 'cargo_pants',     name: '카고 팬츠',    icon: '👖', tags: ['cotton','nylon','woven'], desc: '코튼·나일론 카고',    seasons: ['spring','summer','fall'] },
        { id: 'sweatpants',      name: '스웨트 팬츠',  icon: '👖', tags: ['cotton','jersey'], desc: '조거·트레이닝 팬츠',         seasons: ['spring','fall','winter'] },
        { id: 'leather_pants',   name: '가죽 팬츠',    icon: '👖', tags: ['leather'],         desc: '가죽·에코가죽 팬츠',         seasons: ['fall','winter'] },
        { id: 'nylon_pants',     name: '나일론 팬츠',  icon: '👖', tags: ['nylon','synthetic'], desc: '테크·아웃도어 팬츠',       seasons: ['spring','summer','fall'] },
    ],
    shoes: [
        { id: 'leather_shoes',   name: '가죽 구두',    icon: '👞', tags: ['leather','formal'], desc: '옥스퍼드·더비',            seasons: ['spring','summer','fall','winter'] },
        { id: 'leather_boots',   name: '가죽 부츠',    icon: '🥾', tags: ['leather','boots'],  desc: '첼시·레이스업 부츠',        seasons: ['fall','winter'] },
        { id: 'suede_boots',     name: '스웨이드 부츠', icon: '🥾', tags: ['suede','boots'],   desc: '스웨이드 첼시·데저트',      seasons: ['fall'] },
        { id: 'canvas_sneakers', name: '캔버스 스니커즈', icon: '👟', tags: ['canvas','casual'], desc: '컨버스·잭퍼셀',          seasons: ['spring','summer','fall'] },
        { id: 'leather_sneakers', name: '가죽 스니커즈', icon: '👟', tags: ['leather','casual'], desc: '화이트·클린 스니커즈',   seasons: ['spring','summer','fall','winter'] },
        { id: 'suede_shoes',     name: '스웨이드 슈즈', icon: '👞', tags: ['suede'],           desc: '스웨이드 로퍼·더비',        seasons: ['spring','fall'] },
        { id: 'loafer',          name: '로퍼',         icon: '👞', tags: ['leather','semiformal'], desc: '페니·태슬 로퍼',       seasons: ['spring','summer','fall'] },
        { id: 'hiking_boots',    name: '등산화/트레킹', icon: '🥾', tags: ['nylon','leather','boots'], desc: '고어텍스·트레일',   seasons: ['spring','fall','winter'] },
        { id: 'sandals',         name: '샌들',         icon: '🩴', tags: ['rubber','casual'],  desc: '버켄스탁·스트랩 샌들',      seasons: ['summer'] },
    ],
    scarf: [
        { id: 'wool_scarf',      name: '울 머플러',    icon: '🧣', tags: ['wool','knit'],     desc: '램스울·메리노 머플러',       seasons: ['fall','winter'] },
        { id: 'cashmere_scarf',  name: '캐시미어 머플러', icon: '🧣', tags: ['cashmere','knit'], desc: '캐시미어 스카프',        seasons: ['fall','winter'] },
        { id: 'cotton_scarf',    name: '면 스카프',    icon: '🧣', tags: ['cotton','woven'],  desc: '코튼·가제 스카프',           seasons: ['spring','summer'] },
        { id: 'silk_scarf',      name: '실크 스카프',  icon: '🧣', tags: ['silk','woven'],    desc: '실크 넥커치프',              seasons: ['spring','summer','fall'] },
        { id: 'linen_scarf',     name: '린넨 스카프',  icon: '🧣', tags: ['linen','woven'],   desc: '린넨 스카프·숄',             seasons: ['spring','summer'] },
    ],
};

// 소재 태그 간 궁합 규칙 (태그 쌍 → 궁합)
// great = 추천, ok = 무난, bad = 비추
export const FABRIC_COMPAT_RULES = [
    // === 클래식 좋은 조합 ===
    { a: 'leather',  b: 'denim',     rating: 'great', reason: '가죽×데님: 바이커/캐주얼의 정석 조합' },
    { a: 'leather',  b: 'wool',      rating: 'great', reason: '가죽×울: 격식과 질감의 균형' },
    { a: 'leather',  b: 'cotton',    rating: 'great', reason: '가죽×코튼: 캐주얼하면서 고급스러운 조합' },
    { a: 'leather',  b: 'cashmere',  rating: 'great', reason: '가죽×캐시미어: 럭셔리 레이어링' },
    { a: 'denim',    b: 'cotton',    rating: 'great', reason: '데님×코튼: 가장 자연스러운 캐주얼' },
    { a: 'denim',    b: 'flannel',   rating: 'great', reason: '데님×플란넬: 아메카지·워크웨어 정석' },
    { a: 'denim',    b: 'wool',      rating: 'great', reason: '데님×울: 캐주얼과 따뜻함의 조화' },
    { a: 'wool',     b: 'cotton',    rating: 'great', reason: '울×코튼: 레이어링의 기본' },
    { a: 'wool',     b: 'silk',      rating: 'great', reason: '울×실크: 질감 대비가 돋보이는 고급 조합' },
    { a: 'wool',     b: 'cashmere',  rating: 'great', reason: '울×캐시미어: 따뜻하고 우아한 겨울 조합' },
    { a: 'linen',    b: 'cotton',    rating: 'great', reason: '린넨×코튼: 여름 베스트 조합' },
    { a: 'linen',    b: 'linen',     rating: 'great', reason: '린넨×린넨: 통일감 있는 시원한 룩' },
    { a: 'cotton',   b: 'cotton',    rating: 'great', reason: '코튼×코튼: 편안하고 자연스러운 조합' },
    { a: 'cotton',   b: 'jersey',    rating: 'great', reason: '코튼 셔츠×져지: 기본 레이어링' },
    { a: 'suede',    b: 'denim',     rating: 'great', reason: '스웨이드×데님: 빈티지 무드' },
    { a: 'suede',    b: 'wool',      rating: 'great', reason: '스웨이드×울: 가을 텍스처 레이어링' },
    { a: 'suede',    b: 'cotton',    rating: 'great', reason: '스웨이드×코튼: 자연스러운 질감 믹스' },
    { a: 'suede',    b: 'corduroy',  rating: 'great', reason: '스웨이드×코듀로이: 가을 빈티지 정석' },
    { a: 'tweed',    b: 'cotton',    rating: 'great', reason: '트위드×코튼: 클래식 브리티시 룩' },
    { a: 'tweed',    b: 'wool',      rating: 'great', reason: '트위드×울: 같은 계열의 조화로운 질감' },
    { a: 'tweed',    b: 'silk',      rating: 'great', reason: '트위드×실크: 격식+세련의 클래식 조합' },
    { a: 'corduroy', b: 'cotton',    rating: 'great', reason: '코듀로이×코튼: 가을 캐주얼의 정석' },
    { a: 'corduroy', b: 'wool',      rating: 'great', reason: '코듀로이×울: 가을·겨울 따뜻한 레이어링' },
    { a: 'corduroy', b: 'flannel',   rating: 'great', reason: '코듀로이×플란넬: 빈티지 워크웨어 조합' },
    { a: 'corduroy', b: 'denim',     rating: 'great', reason: '코듀로이×데님: 텍스처 캐주얼' },
    { a: 'waxed',    b: 'wool',      rating: 'great', reason: '왁스드×울: 브리티시 컨트리 정석' },
    { a: 'waxed',    b: 'denim',     rating: 'great', reason: '왁스드×데님: 러기드 아웃도어 무드' },
    { a: 'waxed',    b: 'corduroy',  rating: 'great', reason: '왁스드×코듀로이: 영국식 컨트리 룩' },
    { a: 'knit',     b: 'woven',     rating: 'great', reason: '니트×직물: 질감 대비가 돋보이는 조합' },
    { a: 'knit',     b: 'denim',     rating: 'great', reason: '니트×데님: 캐주얼 레이어링의 기본' },
    { a: 'silk',     b: 'cotton',    rating: 'great', reason: '실크×코튼: 고급스러운 질감 대비' },
    { a: 'pique',    b: 'chino',     rating: 'great', reason: '피케×치노: 프레피 정석 조합' },
    { a: 'pique',    b: 'cotton',    rating: 'great', reason: '피케×코튼: 깔끔한 캐주얼' },

    // === 무난한 조합 ===
    { a: 'leather',  b: 'leather',   rating: 'ok',    reason: '가죽×가죽: 가능하지만 과할 수 있음. 색상 차이를 주세요' },
    { a: 'leather',  b: 'nylon',     rating: 'ok',    reason: '가죽×나일론: 스트리트·테크웨어에서 사용' },
    { a: 'leather',  b: 'fleece',    rating: 'ok',    reason: '가죽×플리스: 가능하지만 스타일이 혼재될 수 있음' },
    { a: 'denim',    b: 'denim',     rating: 'ok',    reason: '데님×데님: 워시 차이를 주면 OK (캐나디안 턱시도)' },
    { a: 'nylon',    b: 'cotton',    rating: 'ok',    reason: '나일론×코튼: 스포티+캐주얼 믹스' },
    { a: 'nylon',    b: 'nylon',     rating: 'ok',    reason: '나일론×나일론: 테크웨어·아웃도어에서 가능' },
    { a: 'nylon',    b: 'denim',     rating: 'ok',    reason: '나일론×데님: 스트리트 캐주얼로 가능' },
    { a: 'fleece',   b: 'denim',     rating: 'ok',    reason: '플리스×데님: 아웃도어 캐주얼' },
    { a: 'fleece',   b: 'cotton',    rating: 'ok',    reason: '플리스×코튼: 실용적인 레이어링' },
    { a: 'fleece',   b: 'nylon',     rating: 'great', reason: '플리스×나일론: 고프코어·아웃도어 정석' },
    { a: 'padding',  b: 'cotton',    rating: 'ok',    reason: '패딩×코튼: 실용적인 겨울 조합' },
    { a: 'padding',  b: 'denim',     rating: 'ok',    reason: '패딩×데님: 겨울 캐주얼 기본' },
    { a: 'padding',  b: 'wool',      rating: 'ok',    reason: '패딩×울: 따뜻하지만 부피감 주의' },
    { a: 'jersey',   b: 'jersey',    rating: 'ok',    reason: '져지×져지: 편하지만 너무 캐주얼할 수 있음' },
    { a: 'jersey',   b: 'denim',     rating: 'great', reason: '져지×데님: 일상 캐주얼의 기본' },
    { a: 'jersey',   b: 'wool',      rating: 'ok',    reason: '져지×울: 포멀도 차이 주의' },
    { a: 'synthetic', b: 'cotton',   rating: 'ok',    reason: '합성×코튼: 기능성+편안함 믹스' },
    { a: 'canvas',   b: 'denim',     rating: 'great', reason: '캔버스×데님: 캐주얼의 정석' },
    { a: 'canvas',   b: 'cotton',    rating: 'great', reason: '캔버스×코튼: 편안한 캐주얼' },
    { a: 'canvas',   b: 'chino',     rating: 'great', reason: '캔버스×치노: 깔끔한 캐주얼' },
    { a: 'rubber',   b: 'cotton',    rating: 'ok',    reason: '러버×코튼: 여름 캐주얼' },
    { a: 'rubber',   b: 'linen',     rating: 'ok',    reason: '러버×린넨: 여름 리조트 룩' },

    // === 비추 조합 ===
    { a: 'leather',  b: 'linen',     rating: 'bad',   reason: '가죽×린넨: 무게감과 계절감이 충돌' },
    { a: 'leather',  b: 'rubber',    rating: 'bad',   reason: '가죽×러버: 격식과 캐주얼이 극단적으로 충돌' },
    { a: 'silk',     b: 'fleece',    rating: 'bad',   reason: '실크×플리스: 격식 차이가 너무 큼' },
    { a: 'silk',     b: 'nylon',     rating: 'bad',   reason: '실크×나일론: 포멀과 스포티가 충돌' },
    { a: 'silk',     b: 'rubber',    rating: 'bad',   reason: '실크×러버: 고급감과 캐주얼이 극단적으로 충돌' },
    { a: 'tweed',    b: 'nylon',     rating: 'bad',   reason: '트위드×나일론: 클래식과 스포티가 충돌' },
    { a: 'tweed',    b: 'fleece',    rating: 'bad',   reason: '트위드×플리스: 격식 차이가 어색함' },
    { a: 'tweed',    b: 'jersey',    rating: 'ok',    reason: '트위드×져지: 믹스매치로 가능하지만 주의' },
    { a: 'cashmere', b: 'nylon',     rating: 'bad',   reason: '캐시미어×나일론: 소재의 품격이 충돌' },
    { a: 'cashmere', b: 'fleece',    rating: 'bad',   reason: '캐시미어×플리스: 고급과 실용이 충돌' },
    { a: 'cashmere', b: 'rubber',    rating: 'bad',   reason: '캐시미어×러버: 격식 차이가 극단적' },
    { a: 'formal',   b: 'fleece',    rating: 'bad',   reason: '포멀×플리스: 격식과 아웃도어가 충돌' },
    { a: 'formal',   b: 'rubber',    rating: 'bad',   reason: '포멀×러버: 격식과 캐주얼이 극단적으로 충돌' },
    { a: 'formal',   b: 'jersey',    rating: 'bad',   reason: '포멀 슈즈×져지: 구두와 맨투맨은 어색함' },
    { a: 'semiformal', b: 'fleece',  rating: 'bad',   reason: '세미포멀×플리스: 스타일 충돌' },
    { a: 'linen',    b: 'wool',      rating: 'bad',   reason: '린넨×울: 계절감이 완전히 충돌' },
    { a: 'linen',    b: 'padding',   rating: 'bad',   reason: '린넨×패딩: 여름과 겨울 소재의 충돌' },
    { a: 'linen',    b: 'fleece',    rating: 'bad',   reason: '린넨×플리스: 계절감이 충돌' },
    { a: 'linen',    b: 'flannel',   rating: 'bad',   reason: '린넨×플란넬: 시원함과 따뜻함이 충돌' },
    { a: 'padding',  b: 'silk',      rating: 'bad',   reason: '패딩×실크: 격식과 기능성이 충돌' },
    { a: 'padding',  b: 'linen',     rating: 'bad',   reason: '패딩×린넨: 계절감이 정반대' },
    { a: 'waxed',    b: 'silk',      rating: 'bad',   reason: '왁스드×실크: 러기드와 섬세함이 충돌' },
    { a: 'waxed',    b: 'linen',     rating: 'bad',   reason: '왁스드×린넨: 계절감이 맞지 않음' },
    { a: 'boots',    b: 'linen',     rating: 'bad',   reason: '부츠×린넨: 무거운 신발과 가벼운 소재의 불균형' },
    { a: 'boots',    b: 'silk',      rating: 'ok',    reason: '부츠×실크: 에지 있는 믹스, 의도적이면 OK' },
    { a: 'corduroy', b: 'linen',     rating: 'bad',   reason: '코듀로이×린넨: 가을과 여름의 계절 충돌' },
    { a: 'flannel',  b: 'linen',     rating: 'bad',   reason: '플란넬×린넨: 따뜻함과 시원함의 충돌' },
    { a: 'rubber',   b: 'wool',      rating: 'bad',   reason: '러버 샌들×울: 계절감이 충돌' },
    { a: 'rubber',   b: 'flannel',   rating: 'bad',   reason: '러버×플란넬: 여름과 가을이 충돌' },
];

// 궁합 조회 함수 — 두 아이템의 태그를 비교하여 가장 강한 궁합 반환
export function getFabricCompat(itemA, itemB) {
    if (!itemA || !itemB) return null;
    let best = null;
    let bestPriority = -1; // bad=2, great=1, ok=0
    const priorityMap = { bad: 2, great: 1, ok: 0 };

    for (const tA of itemA.tags) {
        for (const tB of itemB.tags) {
            for (const rule of FABRIC_COMPAT_RULES) {
                if ((rule.a === tA && rule.b === tB) || (rule.a === tB && rule.b === tA)) {
                    const p = priorityMap[rule.rating] || 0;
                    if (p > bestPriority) {
                        best = rule;
                        bestPriority = p;
                    }
                }
            }
        }
    }
    return best; // { rating, reason } or null
}

// 전체 조합 평가 — 선택된 모든 아이템 쌍 비교
export function evaluateFabricCombo(selections) {
    const entries = Object.entries(selections).filter(([_, v]) => v);
    const pairs = [];
    for (let i = 0; i < entries.length; i++) {
        for (let j = i + 1; j < entries.length; j++) {
            const [partA, itemA] = entries[i];
            const [partB, itemB] = entries[j];
            const compat = getFabricCompat(itemA, itemB);
            pairs.push({
                partA, partB,
                itemA, itemB,
                rating: compat ? compat.rating : 'ok',
                reason: compat ? compat.reason : '특별한 궁합 규칙 없음 — 무난한 조합'
            });
        }
    }
    return pairs;
}
