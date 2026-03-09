// @ts-nocheck
// ================================================================
// colors.ts — 83가지 컬러 팔레트 + HCL 컬러 시스템
// 원본: 바루픽_최신본.html 2359~2519행
// ================================================================

export interface ColorDef {
  name: string
  hex: string
  hcl: [number, number, number]
}

export const COLORS_60: Record<string, ColorDef> = {
    // 엔진 추가 23색
    'hunter_green': { name: '헌터그린', hex: '#1d7245', hcl: [150, 60, 28] },
    'plum': { name: '플럼', hex: '#883a88', hcl: [300, 40, 38] },
    'eggplant': { name: '에그플랜트', hex: '#411c54', hcl: [280, 50, 22] },
    'cognac': { name: '코냑', hex: '#9e662e', hcl: [30, 55, 40] },
    'moss': { name: '모스', hex: '#82a550', hcl: [85, 35, 48] },
    'steel_blue': { name: '스틸블루', hex: '#6a8caf', hcl: [210, 30, 55] },
    'denim': { name: '데님', hex: '#4d77b3', hcl: [215, 40, 50] },
    'brick': { name: '브릭', hex: '#9e3d2e', hcl: [8, 55, 40] },
    'terracotta': { name: '테라코타', hex: '#b85c3d', hcl: [15, 50, 48] },
    'dusty_rose': { name: '더스티로즈', hex: '#b87a85', hcl: [350, 30, 60] },
    'sage': { name: '세이지', hex: '#92ad85', hcl: [100, 20, 60] },
    'mauve': { name: '모브', hex: '#a97096', hcl: [320, 25, 55] },
    'sienna': { name: '시에나', hex: '#b25e34', hcl: [20, 55, 45] },
    'tan': { name: '탄', hex: '#c6b99f', hcl: [40, 25, 70] },
    'mustard': { name: '머스타드', hex: '#d1b647', hcl: [48, 60, 55] },
    'gold': { name: '골드', hex: '#d1b561', hcl: [45, 55, 60] },
    'silver': { name: '실버', hex: '#bfbfbf', hcl: [0, 0, 75] },
    'powder_blue': { name: '파우더블루', hex: '#b9ccd5', hcl: [200, 25, 78] },
    'crimson': { name: '크림슨', hex: '#cf173c', hcl: [348, 80, 45] },
    'burnt_orange': { name: '버닝오렌지', hex: '#bd5528', hcl: [18, 65, 45] },
    'cobalt': { name: '코발트', hex: '#1d56c9', hcl: [220, 75, 45] },
    'amber': { name: '앰버', hex: '#d99726', hcl: [38, 70, 50] },
    'rust': { name: '러스트', hex: '#b14825', hcl: [15, 65, 42] },
    // 베이직 15색
    'white': { name: '화이트', hex: '#FFFFFF', hcl: [0, 0, 100] },
    'ivory': { name: '아이보리', hex: '#FFFFF0', hcl: [60, 5, 98] },
    'beige': { name: '베이지', hex: '#F5F5DC', hcl: [60, 10, 90] },
    'lightgray': { name: '라이트그레이', hex: '#D3D3D3', hcl: [0, 0, 80] },
    'gray': { name: '그레이', hex: '#808080', hcl: [0, 0, 50] },
    'charcoal': { name: '차콜', hex: '#36454F', hcl: [210, 10, 30] },
    'black': { name: '블랙', hex: '#000000', hcl: [0, 0, 0] },
    'brown': { name: '브라운', hex: '#8B4513', hcl: [25, 50, 35] },
    'camel': { name: '카멜', hex: '#C19A6B', hcl: [40, 30, 60] },
    'navy': { name: '네이비', hex: '#000080', hcl: [270, 60, 25] },
    'burgundy': { name: '버건디', hex: '#800020', hcl: [0, 80, 30] },
    'olive': { name: '올리브', hex: '#808000', hcl: [60, 50, 40] },
    'khaki': { name: '카키', hex: '#C3B091', hcl: [45, 25, 65] },
    'cream': { name: '크림', hex: '#FFFDD0', hcl: [55, 8, 95] },
    'taupe': { name: '토프', hex: '#483C32', hcl: [30, 20, 25] },

    // 파스텔 15색
    'pastel_pink': { name: '파스텔핑크', hex: '#FFD1DC', hcl: [350, 40, 85] },
    'pastel_blue': { name: '파스텔블루', hex: '#AEC6CF', hcl: [200, 25, 75] },
    'pastel_green': { name: '파스텔그린', hex: '#B2E0D4', hcl: [160, 30, 80] },
    'pastel_yellow': { name: '파스텔옐로', hex: '#FDFD96', hcl: [60, 50, 90] },
    'pastel_purple': { name: '파스텔퍼플', hex: '#D8BFD8', hcl: [300, 25, 80] },
    'pastel_mint': { name: '파스텔민트', hex: '#B2DFDB', hcl: [170, 25, 82] },
    'pastel_peach': { name: '파스텔피치', hex: '#FFE5B4', hcl: [35, 35, 88] },
    'pastel_lavender': { name: '파스텔라벤더', hex: '#E6E6FA', hcl: [260, 20, 90] },
    'pastel_coral': { name: '파스텔코랄', hex: '#F8B4B4', hcl: [10, 45, 80] },
    'pastel_sky': { name: '파스텔스카이', hex: '#C0E0FF', hcl: [210, 40, 88] },
    'pastel_lilac': { name: '파스텔라일락', hex: '#D7C8EB', hcl: [280, 30, 82] },
    'pastel_sage': { name: '파스텔세이지', hex: '#C8D5B9', hcl: [90, 20, 78] },
    'pastel_lemon': { name: '파스텔레몬', hex: '#FFFACD', hcl: [55, 30, 92] },
    'pastel_rose': { name: '파스텔로즈', hex: '#FFC1CC', hcl: [355, 50, 85] },
    'pastel_aqua': { name: '파스텔아쿠아', hex: '#A0E4E4', hcl: [180, 35, 83] },

    // 비비드 15색
    'red': { name: '레드', hex: '#FF0000', hcl: [0, 100, 50] },
    'blue': { name: '블루', hex: '#0000FF', hcl: [270, 100, 50] },
    'green': { name: '그린', hex: '#00FF00', hcl: [120, 100, 50] },
    'yellow': { name: '옐로', hex: '#FFFF00', hcl: [60, 100, 90] },
    'orange': { name: '오렌지', hex: '#FF8C00', hcl: [30, 90, 55] },
    'purple': { name: '퍼플', hex: '#800080', hcl: [300, 70, 40] },
    'pink': { name: '핑크', hex: '#FF69B4', hcl: [330, 80, 65] },
    'teal': { name: '틸', hex: '#008080', hcl: [180, 70, 40] },
    'lime': { name: '라임', hex: '#00FF00', hcl: [120, 100, 75] },
    'magenta': { name: '마젠타', hex: '#FF00FF', hcl: [300, 100, 60] },
    'cyan': { name: '시안', hex: '#00FFFF', hcl: [180, 100, 70] },
    'coral': { name: '코랄', hex: '#FF7F50', hcl: [15, 80, 65] },
    'turquoise': { name: '터코이즈', hex: '#40E0D0', hcl: [170, 80, 70] },
    'royal_blue': { name: '로얄블루', hex: '#4169E1', hcl: [225, 80, 55] },
    'emerald': { name: '에메랄드', hex: '#50C878', hcl: [140, 70, 65] },

    // 다크 15색
    'dark_red': { name: '다크레드', hex: '#8B0000', hcl: [0, 100, 30] },
    'dark_blue': { name: '다크블루', hex: '#00008B', hcl: [270, 100, 30] },
    'dark_green': { name: '다크그린', hex: '#006400', hcl: [120, 100, 25] },
    'dark_purple': { name: '다크퍼플', hex: '#4B0082', hcl: [275, 80, 30] },
    'dark_brown': { name: '다크브라운', hex: '#654321', hcl: [25, 60, 25] },
    'dark_olive': { name: '다크올리브', hex: '#556B2F', hcl: [80, 60, 30] },
    'dark_teal': { name: '다크틸', hex: '#004D4D', hcl: [180, 80, 25] },
    'wine': { name: '와인', hex: '#722F37', hcl: [355, 60, 30] },
    'forest': { name: '포레스트', hex: '#228B22', hcl: [120, 80, 40] },
    'midnight': { name: '미드나잇', hex: '#191970', hcl: [240, 80, 28] },
    'chocolate': { name: '초콜릿', hex: '#4B3621', hcl: [25, 45, 22] },
    'slate': { name: '슬레이트', hex: '#708090', hcl: [210, 15, 50] },
    'maroon': { name: '마룬', hex: '#800000', hcl: [0, 100, 25] },
    'indigo': { name: '인디고', hex: '#4B0082', hcl: [275, 100, 28] },
    'espresso': { name: '에스프레소', hex: '#3D2B1F', hcl: [30, 35, 18] }
}

// HCL 색상 매핑 (확장)
export const COLORS: Record<string, [number, number, number]> = {
    white: [0, 0, 100], ivory: [60, 5, 97], cream: [55, 8, 94], beige: [45, 12, 88],
    lightgray: [0, 0, 82], silver: [0, 0, 75], gray: [0, 0, 55], charcoal: [210, 8, 30], black: [0, 0, 5],
    espresso: [25, 40, 16], chocolate: [20, 50, 22], dark_brown: [25, 55, 25],
    brown: [25, 50, 35], cognac: [30, 55, 40], rust: [15, 65, 42], sienna: [20, 55, 45],
    camel: [38, 30, 62], tan: [40, 25, 70], khaki: [48, 22, 68], taupe: [30, 15, 48],
    midnight: [240, 70, 18], dark_blue: [230, 80, 28], navy: [225, 65, 25],
    indigo: [245, 60, 30], cobalt: [220, 75, 45], steel_blue: [210, 30, 55],
    slate: [210, 15, 50], powder_blue: [200, 25, 78], denim: [215, 40, 50],
    dark_green: [140, 80, 22], hunter_green: [150, 60, 28], forest: [140, 65, 32],
    dark_olive: [80, 55, 30], olive: [75, 45, 42], moss: [85, 35, 48], sage: [100, 20, 60],
    maroon: [350, 70, 22], dark_red: [355, 75, 30], burgundy: [345, 70, 30],
    wine: [350, 55, 32], brick: [8, 55, 40], crimson: [348, 80, 45],
    terracotta: [15, 50, 48], red: [0, 85, 50],
    eggplant: [280, 50, 22], dark_purple: [275, 60, 28], plum: [300, 40, 38],
    mauve: [320, 25, 55], purple: [280, 60, 42],
    dusty_rose: [350, 30, 60], rose: [345, 50, 55], salmon: [12, 55, 65],
    amber: [38, 70, 50], mustard: [48, 60, 55], gold: [45, 55, 60],
    orange: [25, 80, 55], burnt_orange: [18, 65, 45],
    pastel_pink: [350, 35, 88], pastel_blue: [205, 28, 78], pastel_green: [155, 28, 82],
    pastel_yellow: [55, 40, 92], pastel_mint: [168, 25, 84], pastel_peach: [28, 35, 90],
    pastel_lavender: [260, 22, 88], pastel_coral: [12, 42, 82], pastel_sky: [210, 35, 86],
    pastel_lilac: [280, 25, 84], pastel_sage: [100, 18, 80], pastel_rose: [355, 38, 86],
    pastel_aqua: [180, 30, 84], pastel_lemon: [52, 30, 93],
    teal: [180, 65, 38],
    // 퍼스널컬러용 추가 8색
    peach: [25, 50, 82], apricot: [25, 45, 85], aqua: [180, 80, 65],
    hot_pink: [330, 80, 65], fuchsia: [300, 100, 60], dusty_pink: [0, 25, 70],
    cool_gray: [230, 18, 58], rose_brown: [0, 30, 60],
    // COLORS_60 추가 13색
    pastel_purple: [300, 25, 80], blue: [270, 100, 50], green: [120, 100, 50], yellow: [60, 100, 90],
    pink: [330, 80, 65], lime: [120, 100, 75], magenta: [300, 100, 60], cyan: [180, 100, 70],
    coral: [15, 80, 65], turquoise: [170, 80, 70], royal_blue: [225, 80, 55], emerald: [140, 70, 65], dark_teal: [180, 80, 25],
}

// HCL 접근 함수
export function hcl(c: string): [number, number, number] { return COLORS[c] || [0, 0, 50] }
export function H(c: string): number { return hcl(c)[0] }
export function Cv(c: string): number { return hcl(c)[1] }
export function L(c: string): number { return hcl(c)[2] }

export function hex(c: string): string {
  const [h, s, l] = hcl(c)
  const s2 = s / 100, l2 = l / 100
  const a = s2 * Math.min(l2, 1 - l2)
  const f = (n: number) => { const k = (n + h / 30) % 12; return l2 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1) }
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export const WARM_SET = new Set(['brown', 'dark_brown', 'cognac', 'rust', 'sienna', 'camel', 'tan', 'khaki', 'taupe',
    'espresso', 'chocolate', 'cream', 'ivory', 'beige', 'burgundy', 'wine', 'brick', 'terracotta', 'red', 'crimson',
    'maroon', 'dark_red', 'amber', 'mustard', 'gold', 'orange', 'burnt_orange', 'olive', 'dark_olive', 'forest',
    'pastel_peach', 'pastel_yellow', 'pastel_coral', 'pastel_lemon', 'pastel_rose', 'pastel_pink',
    'dusty_rose', 'rose', 'salmon', 'moss', 'sage', 'peach', 'apricot', 'hot_pink', 'dusty_pink', 'rose_brown']);
export const COOL_SET = new Set(['navy', 'dark_blue', 'indigo', 'midnight', 'cobalt', 'steel_blue', 'slate',
    'powder_blue', 'denim', 'dark_green', 'hunter_green', 'teal',
    'dark_purple', 'eggplant', 'plum', 'mauve', 'purple',
    'pastel_blue', 'pastel_mint', 'pastel_lavender', 'pastel_sky', 'pastel_lilac',
    'pastel_aqua', 'pastel_green', 'pastel_sage', 'aqua', 'cool_gray', 'fuchsia']);
export function temp(c) { return WARM_SET.has(c) ? 'w' : COOL_SET.has(c) ? 'c' : 'n' }

// 컬러 패밀리
export const COLOR_FAMILIES = {
    brown: ['espresso', 'chocolate', 'dark_brown', 'brown', 'cognac', 'rust', 'sienna', 'camel', 'tan', 'khaki', 'beige', 'cream', 'taupe'],
    blue: ['midnight', 'dark_blue', 'navy', 'indigo', 'cobalt', 'denim', 'steel_blue', 'slate', 'powder_blue', 'pastel_blue', 'pastel_sky'],
    green: ['dark_green', 'hunter_green', 'forest', 'dark_olive', 'olive', 'moss', 'sage', 'teal', 'pastel_green', 'pastel_mint', 'pastel_sage', 'pastel_aqua'],
    red: ['maroon', 'dark_red', 'burgundy', 'wine', 'brick', 'crimson', 'terracotta', 'red', 'rust', 'burnt_orange'],
    purple: ['eggplant', 'dark_purple', 'plum', 'purple', 'mauve', 'pastel_lavender', 'pastel_lilac'],
    pink: ['dusty_rose', 'rose', 'salmon', 'pastel_pink', 'pastel_coral', 'pastel_rose', 'pastel_peach'],
    yellow: ['amber', 'mustard', 'gold', 'orange', 'burnt_orange', 'pastel_yellow', 'pastel_lemon'],
    gray: ['black', 'charcoal', 'gray', 'slate', 'silver', 'lightgray', 'white', 'ivory'],
};

// ─── 공유 컬러 유틸리티 (evaluation.ts, recommend.ts 공용) ───

export const PASTEL_COLORS = [
    'pastel_pink', 'pastel_blue', 'pastel_green', 'pastel_yellow', 'pastel_purple',
    'pastel_mint', 'pastel_peach', 'pastel_lavender', 'pastel_coral', 'pastel_sky',
    'pastel_lilac', 'pastel_sage', 'pastel_lemon', 'pastel_rose', 'pastel_aqua'
];

export const EARTH_TONE_COLORS = [
    'brown', 'camel', 'olive', 'khaki', 'taupe', 'beige', 'cream', 'ivory',
    'dark_brown', 'dark_olive', 'chocolate', 'espresso'
];

export function getHueDiff(h1: number, h2: number): number {
    let diff = Math.abs(h1 - h2);
    if (diff > 180) diff = 360 - diff;
    return diff;
}

export function isNeutralColor(chroma: number): boolean {
    return chroma <= 12;
}

export function getToneGroup(h: number, c: number, l: number): string {
    if (c <= 12) return 'neutral';
    if (l <= 35) return 'deep';
    if (l >= 75) return 'light';
    if (c >= 60) return 'bright';
    return 'muted';
}

export function getColorTemperature(h: number, c: number, l: number) {
    if (c <= 12) return { temp: 'neutral', score: 0 };
    let warmScore = 0;
    if ((h >= 0 && h <= 70) || (h >= 320 && h <= 360)) {
        const adjustedH = h >= 320 ? h - 360 : h;
        warmScore = 1.0 - Math.abs(adjustedH - 30) / 70;
    } else if (h >= 200 && h <= 280) {
        warmScore = -1.0 + Math.abs(h - 240) / 80;
    }
    if (c < 30) warmScore *= 0.5;
    let tempResult;
    if (warmScore > 0.3) tempResult = 'warm';
    else if (warmScore < -0.3) tempResult = 'cool';
    else tempResult = 'neutral';
    return { temp: tempResult, score: warmScore };
}

// ─── 클래식/피해야 할 조합 (evaluation.ts, recommend.ts 공용) ───
export const CLASSIC_COMBOS: Record<string, string[]> = {
    'navy': ['burgundy', 'wine', 'olive', 'brown', 'dark_olive', 'forest', 'red', 'maroon'],
    'burgundy': ['navy', 'olive', 'dark_green', 'forest', 'brown', 'camel', 'dark_olive', 'pink', 'pastel_pink'],
    'olive': ['burgundy', 'navy', 'brown', 'wine', 'dark_brown', 'khaki', 'taupe', 'camel'],
    'brown': ['navy', 'burgundy', 'olive', 'dark_green', 'taupe', 'khaki'],
    'wine': ['navy', 'olive', 'camel', 'brown', 'khaki', 'pastel_pink'],
    'forest': ['burgundy', 'navy', 'brown', 'wine', 'camel'],
    'dark_green': ['burgundy', 'brown', 'camel', 'navy', 'wine', 'khaki'],
    'dark_olive': ['burgundy', 'navy', 'wine', 'camel'],
    'red': ['navy', 'charcoal'],
    'maroon': ['navy', 'camel', 'beige', 'khaki'],
    'taupe': ['olive', 'burgundy', 'navy', 'brown', 'camel', 'khaki'],
    'khaki': ['olive', 'burgundy', 'navy', 'brown', 'wine', 'taupe', 'dark_green', 'camel'],
    'camel': ['olive', 'burgundy', 'navy', 'wine', 'forest', 'dark_green', 'dark_olive', 'khaki'],
    'blue': ['purple', 'royal_blue', 'navy'],
    'purple': ['blue', 'pink', 'magenta', 'burgundy'],
};

export const AVOID_COMBOS: Record<string, string[]> = {
    'black': ['navy', 'dark_blue', 'midnight', 'charcoal'],
    'navy': ['black', 'dark_blue', 'midnight', 'indigo'],
    'charcoal': ['black'],
    'red': ['orange', 'magenta', 'coral', 'pink', 'green', 'lime', 'emerald', 'forest', 'dark_green'],
    'green': ['red', 'magenta', 'pink', 'dark_red', 'maroon'],
    'dark_green': ['red', 'dark_red', 'maroon'],
    'forest': ['red', 'dark_red', 'maroon'],
    'burgundy': ['wine', 'maroon', 'dark_red'],
    'brown': ['dark_brown', 'chocolate', 'espresso'],
};
