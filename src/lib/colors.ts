// @ts-nocheck
// ================================================================
// colors.ts — 148색 패션 컬러 팔레트 + HCL 컬러 시스템
// v3.0: 83색 → 148색 확장 + 색 계열별 분류
// ================================================================

export interface ColorDef {
  name: string
  hex: string
  hcl: [number, number, number]
}

export const COLORS_60: Record<string, ColorDef> = {
  // ═══ 무채색 (16) ═══
  'white':       { name: '화이트',       hex: '#FFFFFF', hcl: [0, 0, 100] },
  'off_white':   { name: '오프화이트',   hex: '#F5F5F0', hcl: [60, 3, 95] },
  'ivory':       { name: '아이보리',     hex: '#FFFFF0', hcl: [60, 5, 98] },
  'cream':       { name: '크림',         hex: '#FFFDD0', hcl: [55, 8, 95] },
  'silver':      { name: '실버',         hex: '#BFBFBF', hcl: [0, 0, 75] },
  'lightgray':   { name: '라이트그레이', hex: '#D3D3D3', hcl: [0, 0, 80] },
  'warm_gray':   { name: '웜그레이',     hex: '#C8C0B8', hcl: [30, 8, 72] },
  'cool_gray':   { name: '쿨그레이',     hex: '#B0B8BF', hcl: [210, 8, 70] },
  'ash_gray':    { name: '애쉬그레이',   hex: '#B2BEB5', hcl: [140, 6, 68] },
  'gray':        { name: '그레이',       hex: '#808080', hcl: [0, 0, 50] },
  'pewter':      { name: '퓨터',         hex: '#8E8E8E', hcl: [0, 0, 55] },
  'slate':       { name: '슬레이트',     hex: '#708090', hcl: [210, 15, 50] },
  'charcoal':    { name: '차콜',         hex: '#36454F', hcl: [210, 10, 30] },
  'graphite':    { name: '그래파이트',   hex: '#41424C', hcl: [235, 8, 28] },
  'gunmetal':    { name: '건메탈',       hex: '#2A3439', hcl: [200, 10, 22] },
  'black':       { name: '블랙',         hex: '#000000', hcl: [0, 0, 0] },

  // ═══ 베이지/브라운 (29) ═══
  'linen':       { name: '리넨',         hex: '#FAF0E6', hcl: [30, 8, 92] },
  'ecru':        { name: '에크루',       hex: '#F5E6CC', hcl: [35, 12, 88] },
  'champagne':   { name: '샴페인',       hex: '#F7E7CE', hcl: [35, 10, 90] },
  'bone':        { name: '본',           hex: '#E3D0B9', hcl: [30, 12, 82] },
  'beige':       { name: '베이지',       hex: '#F5F5DC', hcl: [60, 10, 90] },
  'sand':        { name: '샌드',         hex: '#C2B280', hcl: [45, 25, 68] },
  'wheat':       { name: '위트',         hex: '#F5DEB3', hcl: [40, 18, 85] },
  'oatmeal':     { name: '오트밀',       hex: '#D4C7A9', hcl: [42, 15, 76] },
  'stone':       { name: '스톤',         hex: '#D4C9B8', hcl: [35, 10, 78] },
  'mushroom':    { name: '머쉬룸',       hex: '#BDB1A0', hcl: [32, 12, 70] },
  'greige':      { name: '그레이지',     hex: '#BAB0A1', hcl: [38, 10, 68] },
  'khaki':       { name: '카키',         hex: '#C3B091', hcl: [45, 25, 65] },
  'tan':         { name: '탄',           hex: '#C6B99F', hcl: [40, 25, 70] },
  'camel':       { name: '카멜',         hex: '#C19A6B', hcl: [40, 30, 60] },
  'fawn':        { name: '폰',           hex: '#D2B48C', hcl: [32, 22, 72] },
  'honey':       { name: '허니',         hex: '#C68E17', hcl: [38, 65, 55] },
  'caramel':     { name: '카라멜',       hex: '#C07840', hcl: [25, 45, 50] },
  'cognac':      { name: '코냑',         hex: '#9E662E', hcl: [30, 55, 40] },
  'copper':      { name: '카퍼',         hex: '#B87333', hcl: [28, 50, 45] },
  'cinnamon':    { name: '시나몬',       hex: '#D2691E', hcl: [22, 60, 48] },
  'sienna':      { name: '시에나',       hex: '#B25E34', hcl: [20, 55, 45] },
  'brown':       { name: '브라운',       hex: '#8B4513', hcl: [25, 50, 35] },
  'walnut':      { name: '월넛',         hex: '#795C3E', hcl: [30, 30, 38] },
  'mocha':       { name: '모카',         hex: '#6F4E37', hcl: [25, 30, 32] },
  'cocoa':       { name: '코코아',       hex: '#5C4033', hcl: [18, 25, 28] },
  'chestnut':    { name: '체스넛',       hex: '#954535', hcl: [10, 45, 35] },
  'taupe':       { name: '토프',         hex: '#483C32', hcl: [30, 20, 25] },
  'chocolate':   { name: '초콜릿',       hex: '#4B3621', hcl: [25, 45, 22] },
  'espresso':    { name: '에스프레소',   hex: '#3D2B1F', hcl: [30, 35, 18] },

  // ═══ 레드/핑크 (26) ═══
  'shell_pink':  { name: '쉘핑크',       hex: '#FFE4E1', hcl: [5, 15, 90] },
  'pastel_pink': { name: '파스텔핑크',   hex: '#FFD1DC', hcl: [350, 35, 88] },
  'nude_pink':   { name: '누드핑크',     hex: '#E8CCD7', hcl: [335, 15, 82] },
  'rose_pink':   { name: '로즈핑크',     hex: '#F4C2C2', hcl: [0, 22, 78] },
  'blush':       { name: '블러쉬',       hex: '#DE6FA1', hcl: [335, 45, 60] },
  'old_rose':    { name: '올드로즈',     hex: '#C08081', hcl: [0, 25, 55] },
  'dusty_rose':  { name: '더스티로즈',   hex: '#B87A85', hcl: [350, 30, 60] },
  'rose_gold':   { name: '로즈골드',     hex: '#B76E79', hcl: [350, 28, 50] },
  'salmon':      { name: '살몬',         hex: '#FA8072', hcl: [8, 55, 65] },
  'carnation':   { name: '카네이션',     hex: '#FFA6C9', hcl: [340, 40, 72] },
  'flamingo':    { name: '플라밍고',     hex: '#FC8EAC', hcl: [345, 50, 68] },
  'coral':       { name: '코랄',         hex: '#FF7F50', hcl: [15, 80, 65] },
  'hot_pink':    { name: '핫핑크',       hex: '#FF69B4', hcl: [330, 80, 65] },
  'pink':        { name: '핑크',         hex: '#FF1493', hcl: [330, 80, 55] },
  'fuchsia':     { name: '퓨시아',       hex: '#FF00FF', hcl: [300, 100, 60] },
  'raspberry':   { name: '라즈베리',     hex: '#E30B5C', hcl: [340, 80, 42] },
  'scarlet':     { name: '스칼렛',       hex: '#FF2400', hcl: [8, 90, 48] },
  'red':         { name: '레드',         hex: '#FF0000', hcl: [0, 85, 50] },
  'cherry':      { name: '체리',         hex: '#DE3163', hcl: [345, 65, 42] },
  'crimson':     { name: '크림슨',       hex: '#CF173C', hcl: [348, 80, 45] },
  'cardinal':    { name: '카디널',       hex: '#C41E3A', hcl: [350, 70, 38] },
  'ruby':        { name: '루비',         hex: '#9B111E', hcl: [355, 75, 30] },
  'dark_red':    { name: '다크레드',     hex: '#8B0000', hcl: [0, 100, 25] },
  'burgundy':    { name: '버건디',       hex: '#800020', hcl: [345, 70, 30] },
  'wine':        { name: '와인',         hex: '#722F37', hcl: [350, 55, 32] },
  'oxblood':     { name: '옥스블러드',   hex: '#4A0000', hcl: [0, 100, 15] },
  'maroon':      { name: '마룬',         hex: '#800000', hcl: [0, 100, 25] },

  // ═══ 오렌지/옐로 (20) ═══
  'lemon':       { name: '레몬',         hex: '#FFFACD', hcl: [52, 20, 92] },
  'pastel_yellow': { name: '파스텔옐로', hex: '#FDFD96', hcl: [55, 40, 92] },
  'butter':      { name: '버터',         hex: '#F9E4A7', hcl: [42, 25, 88] },
  'canary':      { name: '카나리아',     hex: '#F8DE7E', hcl: [45, 40, 85] },
  'yellow':      { name: '옐로',         hex: '#FFD700', hcl: [50, 80, 82] },
  'saffron':     { name: '사프란',       hex: '#F4C430', hcl: [45, 65, 72] },
  'gold':        { name: '골드',         hex: '#D1B561', hcl: [45, 55, 60] },
  'mustard':     { name: '머스타드',     hex: '#D1B647', hcl: [48, 60, 55] },
  'marigold':    { name: '메리골드',     hex: '#EAA221', hcl: [38, 70, 62] },
  'amber':       { name: '앰버',         hex: '#D99726', hcl: [38, 70, 50] },
  'peach':       { name: '피치',         hex: '#FFDAB9', hcl: [28, 25, 86] },
  'apricot':     { name: '아프리콧',     hex: '#FBCEB1', hcl: [25, 25, 82] },
  'nectarine':   { name: '넥타린',       hex: '#FF9966', hcl: [22, 55, 68] },
  'orange':      { name: '오렌지',       hex: '#FF8C00', hcl: [25, 80, 55] },
  'tangerine':   { name: '탠저린',       hex: '#FF9F00', hcl: [32, 80, 62] },
  'pumpkin':     { name: '펌킨',         hex: '#FF7518', hcl: [22, 80, 52] },
  'burnt_orange': { name: '버닝오렌지', hex: '#BD5528', hcl: [18, 65, 45] },
  'terracotta':  { name: '테라코타',     hex: '#B85C3D', hcl: [15, 50, 48] },
  'rust':        { name: '러스트',       hex: '#B14825', hcl: [15, 65, 42] },
  'brick':       { name: '브릭',         hex: '#9E3D2E', hcl: [8, 55, 40] },

  // ═══ 그린 (23) ═══
  'pastel_mint':  { name: '파스텔민트',  hex: '#C1F0DB', hcl: [150, 20, 88] },
  'pastel_green': { name: '파스텔그린',  hex: '#B2E0D4', hcl: [160, 30, 82] },
  'mint':         { name: '민트',        hex: '#98FB98', hcl: [120, 40, 85] },
  'seafoam':      { name: '씨폼',       hex: '#9FE2BF', hcl: [150, 30, 80] },
  'pistachio':    { name: '피스타치오',  hex: '#93C572', hcl: [95, 35, 72] },
  'apple_green':  { name: '애플그린',    hex: '#8DB600', hcl: [75, 70, 65] },
  'lime':         { name: '라임',        hex: '#32CD32', hcl: [120, 70, 60] },
  'chartreuse':   { name: '샤르트뢰즈', hex: '#ADFF2F', hcl: [80, 80, 80] },
  'kelly_green':  { name: '켈리그린',   hex: '#4CBB17', hcl: [100, 70, 55] },
  'green':        { name: '그린',        hex: '#228B22', hcl: [120, 65, 45] },
  'sage':         { name: '세이지',      hex: '#92AD85', hcl: [100, 20, 60] },
  'pastel_sage':  { name: '파스텔세이지', hex: '#C5D5B5', hcl: [90, 15, 78] },
  'fern':         { name: '펀',          hex: '#9DC183', hcl: [95, 25, 68] },
  'moss':         { name: '모스',        hex: '#82A550', hcl: [85, 35, 48] },
  'olive':        { name: '올리브',      hex: '#808000', hcl: [60, 50, 40] },
  'dark_olive':   { name: '다크올리브',  hex: '#556B2F', hcl: [80, 50, 35] },
  'avocado':      { name: '아보카도',    hex: '#568203', hcl: [80, 65, 40] },
  'army_green':   { name: '아미그린',    hex: '#4B5320', hcl: [70, 45, 30] },
  'jade':         { name: '제이드',      hex: '#00A86B', hcl: [155, 60, 50] },
  'emerald':      { name: '에메랄드',    hex: '#50C878', hcl: [140, 50, 60] },
  'hunter_green': { name: '헌터그린',    hex: '#1D7245', hcl: [150, 60, 28] },
  'forest':       { name: '포레스트',    hex: '#228B22', hcl: [120, 65, 35] },
  'pine':         { name: '파인',        hex: '#01503C', hcl: [160, 60, 22] },
  'bottle_green': { name: '보틀그린',    hex: '#006A4E', hcl: [160, 55, 25] },
  'dark_green':   { name: '다크그린',    hex: '#013220', hcl: [150, 70, 15] },

  // ═══ 블루 (19) ═══
  'ice_blue':     { name: '아이스블루',     hex: '#E0F0FF', hcl: [210, 15, 92] },
  'pastel_sky':   { name: '파스텔스카이',   hex: '#C1E1F2', hcl: [205, 25, 85] },
  'pastel_blue':  { name: '파스텔블루',     hex: '#AEC6CF', hcl: [200, 25, 75] },
  'baby_blue':    { name: '베이비블루',     hex: '#89CFF0', hcl: [205, 40, 75] },
  'sky_blue':     { name: '스카이블루',     hex: '#87CEEB', hcl: [200, 40, 72] },
  'powder_blue':  { name: '파우더블루',     hex: '#B9CCD5', hcl: [200, 25, 78] },
  'dusty_blue':   { name: '더스티블루',     hex: '#B0C4DE', hcl: [215, 25, 72] },
  'steel_blue':   { name: '스틸블루',       hex: '#6A8CAF', hcl: [210, 30, 55] },
  'cornflower':   { name: '콘플라워',       hex: '#6495ED', hcl: [220, 50, 58] },
  'denim':        { name: '데님',           hex: '#4D77B3', hcl: [215, 40, 50] },
  'azure':        { name: '아쥬르',         hex: '#007FFF', hcl: [215, 80, 50] },
  'blue':         { name: '블루',           hex: '#0066CC', hcl: [215, 85, 42] },
  'cobalt':       { name: '코발트',         hex: '#1D56C9', hcl: [220, 75, 45] },
  'royal_blue':   { name: '로얄블루',       hex: '#4169E1', hcl: [225, 75, 50] },
  'sapphire':     { name: '사파이어',       hex: '#0F52BA', hcl: [225, 75, 38] },
  'petrol':       { name: '페트롤',         hex: '#1B3A4B', hcl: [200, 35, 25] },
  'prussian_blue': { name: '프러시안블루', hex: '#003153', hcl: [210, 60, 22] },
  'navy':         { name: '네이비',         hex: '#000080', hcl: [240, 65, 20] },
  'midnight':     { name: '미드나이트',     hex: '#191970', hcl: [240, 70, 18] },

  // ═══ 퍼플 (17) ═══
  'pastel_lavender': { name: '파스텔라벤더', hex: '#E8DFF5', hcl: [270, 15, 88] },
  'lavender':     { name: '라벤더',         hex: '#E6E6FA', hcl: [240, 15, 85] },
  'pastel_lilac': { name: '파스텔라일락',   hex: '#DCD0FF', hcl: [260, 20, 82] },
  'lilac':        { name: '라일락',         hex: '#C8A2C8', hcl: [300, 20, 68] },
  'periwinkle':   { name: '페리윙클',       hex: '#CCCCFF', hcl: [240, 25, 78] },
  'wisteria':     { name: '위스테리아',     hex: '#C9A0DC', hcl: [280, 28, 68] },
  'heather':      { name: '헤더',           hex: '#B8A9C9', hcl: [270, 15, 65] },
  'pastel_purple': { name: '파스텔퍼플',   hex: '#D8BFD8', hcl: [300, 20, 78] },
  'orchid':       { name: '오키드',         hex: '#DA70D6', hcl: [302, 45, 58] },
  'mauve':        { name: '모브',           hex: '#A97096', hcl: [320, 25, 55] },
  'amethyst':     { name: '아메시스트',     hex: '#9966CC', hcl: [270, 40, 48] },
  'purple':       { name: '퍼플',           hex: '#800080', hcl: [300, 60, 35] },
  'violet':       { name: '바이올렛',       hex: '#7F00FF', hcl: [270, 90, 40] },
  'plum':         { name: '플럼',           hex: '#883A88', hcl: [300, 40, 38] },
  'mulberry':     { name: '멀베리',         hex: '#770737', hcl: [340, 60, 25] },
  'grape':        { name: '그레이프',       hex: '#6F2DA8', hcl: [275, 55, 32] },
  'eggplant':     { name: '에그플랜트',     hex: '#411C54', hcl: [280, 50, 22] },
  'indigo':       { name: '인디고',         hex: '#310062', hcl: [275, 80, 18] },

  // ═══ 틸/시안 (그린+블루 탭에 분배, 호환용) ═══
  'teal':        { name: '틸',         hex: '#008080', hcl: [180, 65, 38] },
  'turquoise':   { name: '터콰이즈',   hex: '#40E0D0', hcl: [175, 60, 70] },
  'peacock':     { name: '피콕',       hex: '#006D6F', hcl: [182, 55, 32] },

  // ═══ 호환용 (기존 키 유지, 중복 제거) ═══
  'dark_brown':  { name: '다크브라운',   hex: '#3B2F2F', hcl: [0, 15, 20] },
  'dark_blue':   { name: '다크블루',     hex: '#00008B', hcl: [240, 80, 18] },
  'dark_purple': { name: '다크퍼플',     hex: '#301934', hcl: [285, 40, 15] },
  'dark_teal':   { name: '다크틸',       hex: '#003B3C', hcl: [182, 60, 18] },
  'magenta':     { name: '마젠타',       hex: '#FF00FF', hcl: [300, 100, 60] },
  'cyan':        { name: '시안',         hex: '#00FFFF', hcl: [180, 80, 80] },
  'pastel_coral': { name: '파스텔코랄', hex: '#F8B4A8', hcl: [12, 35, 82] },
  'pastel_rose':  { name: '파스텔로즈', hex: '#F8C8D4', hcl: [345, 30, 85] },
  'pastel_lemon': { name: '파스텔레몬', hex: '#FDFD96', hcl: [52, 30, 93] },
  'pastel_aqua':  { name: '파스텔아쿠아', hex: '#B0E0D8', hcl: [168, 25, 82] },
}

// ═══ 컬러 탭 구조 (ColorPicker에서 사용) ═══
export const COLOR_TABS = [
  {
    id: 'achromatic', label: '무채색', emoji: '⬜',
    keys: ['white','off_white','ivory','cream','silver','lightgray','warm_gray','cool_gray','ash_gray','gray','pewter','slate','charcoal','graphite','gunmetal','black'],
  },
  {
    id: 'beige_brown', label: '베이지/브라운', emoji: '🤎',
    keys: ['linen','ecru','champagne','bone','beige','sand','wheat','oatmeal','stone','mushroom','greige','khaki','tan','camel','fawn','honey','caramel','cognac','copper','cinnamon','sienna','brown','walnut','mocha','cocoa','chestnut','taupe','chocolate','espresso'],
  },
  {
    id: 'red_pink', label: '레드/핑크', emoji: '❤️',
    keys: ['shell_pink','pastel_pink','nude_pink','rose_pink','blush','old_rose','dusty_rose','rose_gold','salmon','carnation','flamingo','coral','hot_pink','pink','fuchsia','raspberry','scarlet','red','cherry','crimson','cardinal','ruby','dark_red','burgundy','wine','oxblood','maroon'],
  },
  {
    id: 'orange_yellow', label: '오렌지/옐로', emoji: '🟡',
    keys: ['lemon','pastel_yellow','butter','canary','yellow','saffron','gold','mustard','marigold','amber','peach','apricot','nectarine','orange','tangerine','pumpkin','burnt_orange','terracotta','rust','brick'],
  },
  {
    id: 'green', label: '그린', emoji: '🟢',
    keys: ['pastel_mint','pastel_green','mint','seafoam','pistachio','apple_green','lime','chartreuse','kelly_green','green','sage','pastel_sage','fern','moss','olive','dark_olive','avocado','army_green','jade','emerald','teal','turquoise','peacock','hunter_green','forest','pine','bottle_green','dark_green'],
  },
  {
    id: 'blue', label: '블루', emoji: '🔵',
    keys: ['ice_blue','pastel_sky','pastel_blue','baby_blue','sky_blue','powder_blue','dusty_blue','steel_blue','cornflower','denim','azure','blue','cobalt','royal_blue','sapphire','petrol','prussian_blue','navy','midnight'],
  },
  {
    id: 'purple', label: '퍼플', emoji: '🟣',
    keys: ['pastel_lavender','lavender','pastel_lilac','lilac','periwinkle','wisteria','heather','pastel_purple','orchid','mauve','amethyst','purple','violet','plum','mulberry','grape','eggplant','indigo'],
  },
]

// ═══ Legacy HCL 매핑 (evaluation.ts, recommend.ts 호환) ═══
export const COLORS: Record<string, [number, number, number]> = {}
// COLORS_60에서 자동 생성
Object.entries(COLORS_60).forEach(([k, v]) => { COLORS[k] = v.hcl })

// HCL 접근 함수
export function hcl(c: string): [number, number, number] { return COLORS[c] || [0, 0, 50] }
export function H(c: string): number { return hcl(c)[0] }
export function Cv(c: string): number { return hcl(c)[1] }
export function L(c: string): number { return hcl(c)[2] }

export function hex(c: string): string {
  const def = COLORS_60[c]
  if (def) return def.hex
  const [h, s, l] = hcl(c)
  const s2 = s / 100, l2 = l / 100
  const a = s2 * Math.min(l2, 1 - l2)
  const f = (n: number) => { const k = (n + h / 30) % 12; return l2 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1) }
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

// 온도 분류
export const WARM_SET = new Set([
  'brown','dark_brown','cognac','rust','sienna','camel','tan','khaki','taupe','fawn','honey','caramel','copper','cinnamon','walnut','mocha','cocoa','chestnut','chocolate',
  'espresso','cream','ivory','beige','linen','ecru','champagne','bone','wheat','oatmeal','sand',
  'burgundy','wine','brick','terracotta','red','crimson','scarlet','cherry','cardinal','ruby','oxblood',
  'maroon','dark_red','amber','mustard','gold','orange','burnt_orange','tangerine','pumpkin','nectarine','marigold','saffron',
  'olive','dark_olive','forest','moss','avocado','army_green',
  'peach','apricot','salmon','coral','flamingo','carnation',
  'pastel_peach','pastel_yellow','pastel_coral','pastel_lemon','pastel_rose','pastel_pink',
  'dusty_rose','old_rose','rose_pink','rose_gold','blush','shell_pink','nude_pink',
  'hot_pink','raspberry','lemon','butter','canary','yellow',
])
export const COOL_SET = new Set([
  'navy','dark_blue','indigo','midnight','cobalt','steel_blue','slate','cornflower','azure','sapphire','prussian_blue','petrol',
  'powder_blue','denim','baby_blue','sky_blue','ice_blue','dusty_blue',
  'dark_green','hunter_green','teal','dark_teal','pine','bottle_green','peacock','jade',
  'dark_purple','eggplant','plum','mauve','purple','violet','grape','mulberry','amethyst',
  'pastel_blue','pastel_mint','pastel_lavender','pastel_sky','pastel_lilac','pastel_green','pastel_sage','pastel_aqua',
  'lavender','lilac','periwinkle','wisteria','heather','orchid',
  'cool_gray','graphite','gunmetal',
  'fuchsia','magenta','cyan','turquoise',
])
export function temp(c) { return WARM_SET.has(c) ? 'w' : COOL_SET.has(c) ? 'c' : 'n' }

// 컬러 패밀리
export const COLOR_FAMILIES = {
  brown: ['espresso','chocolate','dark_brown','brown','cognac','rust','sienna','camel','tan','khaki','beige','cream','taupe','mocha','cocoa','chestnut','walnut','cinnamon','copper','caramel','honey','fawn'],
  blue: ['midnight','dark_blue','navy','indigo','cobalt','denim','steel_blue','slate','powder_blue','baby_blue','sky_blue','ice_blue','dusty_blue','cornflower','azure','royal_blue','sapphire','prussian_blue','petrol','pastel_blue','pastel_sky'],
  green: ['dark_green','hunter_green','forest','pine','bottle_green','dark_olive','olive','moss','sage','teal','jade','emerald','avocado','army_green','kelly_green','lime','mint','seafoam','pistachio','fern','apple_green','chartreuse','pastel_green','pastel_mint','pastel_sage','pastel_aqua','peacock','turquoise'],
  red: ['maroon','dark_red','burgundy','wine','brick','crimson','terracotta','red','rust','burnt_orange','scarlet','cherry','cardinal','ruby','oxblood','raspberry'],
  purple: ['eggplant','dark_purple','plum','purple','mauve','violet','grape','mulberry','amethyst','orchid','wisteria','heather','lilac','lavender','periwinkle','pastel_lavender','pastel_lilac','pastel_purple','indigo'],
  pink: ['dusty_rose','old_rose','rose_pink','rose_gold','blush','salmon','coral','flamingo','carnation','hot_pink','pink','fuchsia','shell_pink','nude_pink','pastel_pink','pastel_coral','pastel_rose'],
  yellow: ['amber','mustard','gold','orange','burnt_orange','tangerine','pumpkin','nectarine','marigold','saffron','peach','apricot','lemon','butter','canary','yellow','pastel_yellow','pastel_lemon','pastel_peach'],
  gray: ['black','gunmetal','graphite','charcoal','gray','slate','pewter','ash_gray','cool_gray','warm_gray','silver','lightgray','white','ivory','off_white','cream'],
}

// ─── 공유 컬러 유틸리티 (evaluation.ts, recommend.ts 공용) ───

export const PASTEL_COLORS = [
  'pastel_pink','pastel_blue','pastel_green','pastel_yellow','pastel_purple',
  'pastel_mint','pastel_peach','pastel_lavender','pastel_coral','pastel_sky',
  'pastel_lilac','pastel_sage','pastel_lemon','pastel_rose','pastel_aqua',
  'shell_pink','nude_pink','rose_pink','ice_blue','pastel_sky','lavender',
  'lemon','butter','peach','apricot','mint','seafoam','baby_blue','sky_blue',
  'lilac','periwinkle','wisteria','heather',
]

export const EARTH_TONE_COLORS = [
  'brown','camel','olive','khaki','taupe','beige','cream','ivory',
  'dark_brown','dark_olive','chocolate','espresso','cognac','sienna',
  'terracotta','rust','brick','sand','oatmeal','mushroom','greige',
  'tan','stone','wheat','fawn','mocha','cocoa','walnut','cinnamon',
  'copper','caramel','honey','chestnut','linen','ecru','bone',
]

export function getHueDiff(h1: number, h2: number): number {
  let diff = Math.abs(h1 - h2)
  if (diff > 180) diff = 360 - diff
  return diff
}

export function isNeutralColor(chroma: number): boolean {
  return chroma <= 12
}

export function getToneGroup(h: number, c: number, l: number): string {
  if (c <= 12) return 'neutral'
  if (l <= 35) return 'deep'
  if (l >= 75) return 'light'
  if (c >= 60) return 'bright'
  return 'muted'
}

export function getColorTemperature(h: number, c: number, l: number) {
  if (c <= 12) return { temp: 'neutral', score: 0 }
  let warmScore = 0
  if ((h >= 0 && h <= 70) || (h >= 320 && h <= 360)) {
    const adjustedH = h >= 320 ? h - 360 : h
    warmScore = 1.0 - Math.abs(adjustedH - 30) / 70
  } else if (h >= 200 && h <= 280) {
    warmScore = -1.0 + Math.abs(h - 240) / 80
  }
  if (c < 30) warmScore *= 0.5
  let tempResult
  if (warmScore > 0.3) tempResult = 'warm'
  else if (warmScore < -0.3) tempResult = 'cool'
  else tempResult = 'neutral'
  return { temp: tempResult, score: warmScore }
}

// ─── 클래식/피해야 할 조합 (evaluation.ts, recommend.ts 공용) ───
export const CLASSIC_COMBOS: Record<string, string[]> = {
  'navy': ['burgundy','wine','olive','brown','dark_olive','forest','red','maroon','camel','beige','cream','white','cognac'],
  'burgundy': ['navy','olive','dark_green','forest','brown','camel','dark_olive','pink','pastel_pink','beige','cream'],
  'olive': ['burgundy','navy','brown','wine','dark_brown','khaki','taupe','camel','cream','beige'],
  'brown': ['navy','burgundy','olive','dark_green','taupe','khaki','cream','beige','tan'],
  'wine': ['navy','olive','camel','brown','khaki','pastel_pink','cream','beige'],
  'forest': ['burgundy','navy','brown','wine','camel','cream','beige'],
  'dark_green': ['burgundy','brown','camel','navy','wine','khaki','cream'],
  'dark_olive': ['burgundy','navy','wine','camel','cream'],
  'red': ['navy','charcoal','white','black'],
  'maroon': ['navy','camel','beige','khaki','cream'],
  'taupe': ['olive','burgundy','navy','brown','camel','khaki','cream'],
  'khaki': ['olive','burgundy','navy','brown','wine','taupe','dark_green','camel'],
  'camel': ['olive','burgundy','navy','wine','forest','dark_green','dark_olive','khaki','white','cream'],
  'blue': ['purple','royal_blue','navy','white','cream'],
  'purple': ['blue','pink','magenta','burgundy','cream','lavender'],
  'charcoal': ['burgundy','navy','camel','cream','white','dusty_rose'],
  'black': ['white','red','royal_blue','emerald','gold','cream','ivory'],
}

export const AVOID_COMBOS: Record<string, string[]> = {
  'black': ['navy','dark_blue','midnight','charcoal','graphite','gunmetal'],
  'navy': ['black','dark_blue','midnight','indigo','graphite'],
  'charcoal': ['black','graphite','gunmetal'],
  'red': ['orange','magenta','coral','pink','green','lime','emerald','forest','dark_green'],
  'green': ['red','magenta','pink','dark_red','maroon'],
  'dark_green': ['red','dark_red','maroon'],
  'forest': ['red','dark_red','maroon'],
  'burgundy': ['wine','maroon','dark_red','oxblood'],
  'brown': ['dark_brown','chocolate','espresso','mocha'],
}
