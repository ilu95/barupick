// @ts-nocheck
import i18n from '@/i18n';
// ================================================================
// categories.ts — 카테고리 이름 + 파트 아이콘 + 소재 데이터
// 원본: 바루픽_최신본.html 6161~6403행
// ================================================================

export const CATEGORY_NAMES: Record<string, string> = new Proxy({} as Record<string, string>, {
    get(_, key: string) {
        return i18n.t(`categories:names.${key}`, key);
    }
});

export const PART_ICONS = {
    outer: '🧥', middleware: '🧶', top: '👔', inner: '👕',
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
    spring: { get name() { return i18n.t('categories:seasons.spring') }, emoji: '🌸' },
    summer: { get name() { return i18n.t('categories:seasons.summer') }, emoji: '☀️' },
    fall:   { get name() { return i18n.t('categories:seasons.fall') }, emoji: '🍂' },
    winter: { get name() { return i18n.t('categories:seasons.winter') }, emoji: '❄️' }
};

// 부위별 아이템+소재 목록
export const FABRIC_ITEMS = {
    outer: [
        { id: 'leather_jacket',  get name() { return i18n.t('categories:fabricItems.outer.leather_jacket.name') },  icon: '🧥', tags: ['leather'],         get desc() { return i18n.t('categories:fabricItems.outer.leather_jacket.desc') }, seasons: ['spring','fall'] },
        { id: 'denim_jacket',    get name() { return i18n.t('categories:fabricItems.outer.denim_jacket.name') },    icon: '🧥', tags: ['denim'],           get desc() { return i18n.t('categories:fabricItems.outer.denim_jacket.desc') },   seasons: ['spring','fall'] },
        { id: 'wool_coat',       get name() { return i18n.t('categories:fabricItems.outer.wool_coat.name') },       icon: '🧥', tags: ['wool','woven'],    get desc() { return i18n.t('categories:fabricItems.outer.wool_coat.desc') },      seasons: ['fall','winter'] },
        { id: 'padding',         get name() { return i18n.t('categories:fabricItems.outer.padding.name') },         icon: '🧥', tags: ['nylon','padding'], get desc() { return i18n.t('categories:fabricItems.outer.padding.desc') },        seasons: ['winter'] },
        { id: 'fleece_jacket',   get name() { return i18n.t('categories:fabricItems.outer.fleece_jacket.name') },   icon: '🧥', tags: ['fleece','synthetic'], get desc() { return i18n.t('categories:fabricItems.outer.fleece_jacket.desc') }, seasons: ['fall','winter'] },
        { id: 'cotton_jacket',   get name() { return i18n.t('categories:fabricItems.outer.cotton_jacket.name') },   icon: '🧥', tags: ['cotton','woven'],  get desc() { return i18n.t('categories:fabricItems.outer.cotton_jacket.desc') },  seasons: ['spring','fall'] },
        { id: 'nylon_jacket',    get name() { return i18n.t('categories:fabricItems.outer.nylon_jacket.name') },    icon: '🧥', tags: ['nylon','synthetic'], get desc() { return i18n.t('categories:fabricItems.outer.nylon_jacket.desc') }, seasons: ['spring','summer','fall'] },
        { id: 'linen_jacket',    get name() { return i18n.t('categories:fabricItems.outer.linen_jacket.name') },    icon: '🧥', tags: ['linen','woven'],   get desc() { return i18n.t('categories:fabricItems.outer.linen_jacket.desc') },   seasons: ['spring','summer'] },
        { id: 'tweed_jacket',    get name() { return i18n.t('categories:fabricItems.outer.tweed_jacket.name') },    icon: '🧥', tags: ['wool','tweed','woven'], get desc() { return i18n.t('categories:fabricItems.outer.tweed_jacket.desc') }, seasons: ['fall','winter'] },
        { id: 'suede_jacket',    get name() { return i18n.t('categories:fabricItems.outer.suede_jacket.name') },    icon: '🧥', tags: ['suede'],          get desc() { return i18n.t('categories:fabricItems.outer.suede_jacket.desc') },   seasons: ['spring','fall'] },
        { id: 'waxed_jacket',    get name() { return i18n.t('categories:fabricItems.outer.waxed_jacket.name') },    icon: '🧥', tags: ['waxed','cotton'],  get desc() { return i18n.t('categories:fabricItems.outer.waxed_jacket.desc') },   seasons: ['fall','winter'] },
    ],
    middleware: [
        { id: 'wool_knit',       get name() { return i18n.t('categories:fabricItems.middleware.wool_knit.name') },       icon: '🧶', tags: ['wool','knit'],     get desc() { return i18n.t('categories:fabricItems.middleware.wool_knit.desc') },       seasons: ['fall','winter'] },
        { id: 'cotton_knit',     get name() { return i18n.t('categories:fabricItems.middleware.cotton_knit.name') },     icon: '🧶', tags: ['cotton','knit'],   get desc() { return i18n.t('categories:fabricItems.middleware.cotton_knit.desc') },     seasons: ['spring','fall'] },
        { id: 'cashmere_knit',   get name() { return i18n.t('categories:fabricItems.middleware.cashmere_knit.name') },   icon: '🧶', tags: ['cashmere','knit'], get desc() { return i18n.t('categories:fabricItems.middleware.cashmere_knit.desc') },   seasons: ['fall','winter'] },
        { id: 'fleece_mid',      get name() { return i18n.t('categories:fabricItems.middleware.fleece_mid.name') },      icon: '🧶', tags: ['fleece','synthetic'], get desc() { return i18n.t('categories:fabricItems.middleware.fleece_mid.desc') },   seasons: ['fall','winter'] },
        { id: 'cardigan_wool',   get name() { return i18n.t('categories:fabricItems.middleware.cardigan_wool.name') },   icon: '🧶', tags: ['wool','knit'],     get desc() { return i18n.t('categories:fabricItems.middleware.cardigan_wool.desc') },   seasons: ['fall','winter'] },
        { id: 'vest_padding',    get name() { return i18n.t('categories:fabricItems.middleware.vest_padding.name') },    icon: '🧶', tags: ['nylon','padding'], get desc() { return i18n.t('categories:fabricItems.middleware.vest_padding.desc') },    seasons: ['fall','winter'] },
        { id: 'vest_knit',       get name() { return i18n.t('categories:fabricItems.middleware.vest_knit.name') },       icon: '🧶', tags: ['wool','knit'],     get desc() { return i18n.t('categories:fabricItems.middleware.vest_knit.desc') },       seasons: ['spring','fall','winter'] },
        { id: 'hoodie',          get name() { return i18n.t('categories:fabricItems.middleware.hoodie.name') },          icon: '🧶', tags: ['cotton','jersey'], get desc() { return i18n.t('categories:fabricItems.middleware.hoodie.desc') },          seasons: ['spring','fall','winter'] },
        { id: 'sweatshirt_mid',  get name() { return i18n.t('categories:fabricItems.middleware.sweatshirt_mid.name') },  icon: '🧶', tags: ['cotton','jersey'], get desc() { return i18n.t('categories:fabricItems.middleware.sweatshirt_mid.desc') },  seasons: ['spring','fall'] },
    ],
    top: [
        { id: 'cotton_tee',      get name() { return i18n.t('categories:fabricItems.top.cotton_tee.name') },      icon: '👔', tags: ['cotton','jersey'], get desc() { return i18n.t('categories:fabricItems.top.cotton_tee.desc') },      seasons: ['spring','summer','fall'] },
        { id: 'oxford_shirt',    get name() { return i18n.t('categories:fabricItems.top.oxford_shirt.name') },    icon: '👔', tags: ['cotton','woven'], get desc() { return i18n.t('categories:fabricItems.top.oxford_shirt.desc') },    seasons: ['spring','summer','fall'] },
        { id: 'linen_shirt',     get name() { return i18n.t('categories:fabricItems.top.linen_shirt.name') },     icon: '👔', tags: ['linen','woven'],   get desc() { return i18n.t('categories:fabricItems.top.linen_shirt.desc') },     seasons: ['spring','summer'] },
        { id: 'flannel_shirt',   get name() { return i18n.t('categories:fabricItems.top.flannel_shirt.name') },   icon: '👔', tags: ['cotton','flannel','woven'], get desc() { return i18n.t('categories:fabricItems.top.flannel_shirt.desc') }, seasons: ['fall','winter'] },
        { id: 'denim_shirt',     get name() { return i18n.t('categories:fabricItems.top.denim_shirt.name') },     icon: '👔', tags: ['denim','woven'],   get desc() { return i18n.t('categories:fabricItems.top.denim_shirt.desc') },     seasons: ['spring','fall'] },
        { id: 'silk_blouse',     get name() { return i18n.t('categories:fabricItems.top.silk_blouse.name') },     icon: '👔', tags: ['silk','woven'],    get desc() { return i18n.t('categories:fabricItems.top.silk_blouse.desc') },     seasons: ['spring','summer','fall'] },
        { id: 'polo_shirt',      get name() { return i18n.t('categories:fabricItems.top.polo_shirt.name') },      icon: '👔', tags: ['cotton','pique'],  get desc() { return i18n.t('categories:fabricItems.top.polo_shirt.desc') },      seasons: ['spring','summer'] },
        { id: 'turtleneck',      get name() { return i18n.t('categories:fabricItems.top.turtleneck.name') },      icon: '👔', tags: ['cotton','jersey'], get desc() { return i18n.t('categories:fabricItems.top.turtleneck.desc') },      seasons: ['fall','winter'] },
        { id: 'wool_turtleneck', get name() { return i18n.t('categories:fabricItems.top.wool_turtleneck.name') }, icon: '👔', tags: ['wool','knit'],     get desc() { return i18n.t('categories:fabricItems.top.wool_turtleneck.desc') }, seasons: ['fall','winter'] },
        { id: 'henley',          get name() { return i18n.t('categories:fabricItems.top.henley.name') },          icon: '👔', tags: ['cotton','jersey'], get desc() { return i18n.t('categories:fabricItems.top.henley.desc') },          seasons: ['spring','fall'] },
    ],
    bottom: [
        { id: 'raw_denim',       get name() { return i18n.t('categories:fabricItems.bottom.raw_denim.name') },       icon: '👖', tags: ['denim'],           get desc() { return i18n.t('categories:fabricItems.bottom.raw_denim.desc') },       seasons: ['spring','summer','fall','winter'] },
        { id: 'chino',           get name() { return i18n.t('categories:fabricItems.bottom.chino.name') },           icon: '👖', tags: ['cotton','woven','chino'], get desc() { return i18n.t('categories:fabricItems.bottom.chino.desc') },      seasons: ['spring','summer','fall'] },
        { id: 'wool_slacks',     get name() { return i18n.t('categories:fabricItems.bottom.wool_slacks.name') },     icon: '👖', tags: ['wool','woven'],    get desc() { return i18n.t('categories:fabricItems.bottom.wool_slacks.desc') },     seasons: ['fall','winter'] },
        { id: 'linen_pants',     get name() { return i18n.t('categories:fabricItems.bottom.linen_pants.name') },     icon: '👖', tags: ['linen','woven'],   get desc() { return i18n.t('categories:fabricItems.bottom.linen_pants.desc') },     seasons: ['spring','summer'] },
        { id: 'corduroy',        get name() { return i18n.t('categories:fabricItems.bottom.corduroy.name') },        icon: '👖', tags: ['cotton','corduroy'], get desc() { return i18n.t('categories:fabricItems.bottom.corduroy.desc') },      seasons: ['fall','winter'] },
        { id: 'cotton_shorts',   get name() { return i18n.t('categories:fabricItems.bottom.cotton_shorts.name') },   icon: '👖', tags: ['cotton','woven'],  get desc() { return i18n.t('categories:fabricItems.bottom.cotton_shorts.desc') },   seasons: ['summer'] },
        { id: 'cargo_pants',     get name() { return i18n.t('categories:fabricItems.bottom.cargo_pants.name') },     icon: '👖', tags: ['cotton','nylon','woven'], get desc() { return i18n.t('categories:fabricItems.bottom.cargo_pants.desc') }, seasons: ['spring','summer','fall'] },
        { id: 'sweatpants',      get name() { return i18n.t('categories:fabricItems.bottom.sweatpants.name') },      icon: '👖', tags: ['cotton','jersey'], get desc() { return i18n.t('categories:fabricItems.bottom.sweatpants.desc') },      seasons: ['spring','fall','winter'] },
        { id: 'leather_pants',   get name() { return i18n.t('categories:fabricItems.bottom.leather_pants.name') },   icon: '👖', tags: ['leather'],         get desc() { return i18n.t('categories:fabricItems.bottom.leather_pants.desc') },   seasons: ['fall','winter'] },
        { id: 'nylon_pants',     get name() { return i18n.t('categories:fabricItems.bottom.nylon_pants.name') },     icon: '👖', tags: ['nylon','synthetic'], get desc() { return i18n.t('categories:fabricItems.bottom.nylon_pants.desc') },   seasons: ['spring','summer','fall'] },
    ],
    shoes: [
        { id: 'leather_shoes',   get name() { return i18n.t('categories:fabricItems.shoes.leather_shoes.name') },   icon: '👞', tags: ['leather','formal'], get desc() { return i18n.t('categories:fabricItems.shoes.leather_shoes.desc') },   seasons: ['spring','summer','fall','winter'] },
        { id: 'leather_boots',   get name() { return i18n.t('categories:fabricItems.shoes.leather_boots.name') },   icon: '🥾', tags: ['leather','boots'],  get desc() { return i18n.t('categories:fabricItems.shoes.leather_boots.desc') },   seasons: ['fall','winter'] },
        { id: 'suede_boots',     get name() { return i18n.t('categories:fabricItems.shoes.suede_boots.name') },     icon: '🥾', tags: ['suede','boots'],   get desc() { return i18n.t('categories:fabricItems.shoes.suede_boots.desc') },     seasons: ['fall'] },
        { id: 'canvas_sneakers', get name() { return i18n.t('categories:fabricItems.shoes.canvas_sneakers.name') }, icon: '👟', tags: ['canvas','casual'], get desc() { return i18n.t('categories:fabricItems.shoes.canvas_sneakers.desc') }, seasons: ['spring','summer','fall'] },
        { id: 'leather_sneakers', get name() { return i18n.t('categories:fabricItems.shoes.leather_sneakers.name') }, icon: '👟', tags: ['leather','casual'], get desc() { return i18n.t('categories:fabricItems.shoes.leather_sneakers.desc') }, seasons: ['spring','summer','fall','winter'] },
        { id: 'suede_shoes',     get name() { return i18n.t('categories:fabricItems.shoes.suede_shoes.name') },     icon: '👞', tags: ['suede'],           get desc() { return i18n.t('categories:fabricItems.shoes.suede_shoes.desc') },     seasons: ['spring','fall'] },
        { id: 'loafer',          get name() { return i18n.t('categories:fabricItems.shoes.loafer.name') },          icon: '👞', tags: ['leather','semiformal'], get desc() { return i18n.t('categories:fabricItems.shoes.loafer.desc') },     seasons: ['spring','summer','fall'] },
        { id: 'hiking_boots',    get name() { return i18n.t('categories:fabricItems.shoes.hiking_boots.name') },    icon: '🥾', tags: ['nylon','leather','boots'], get desc() { return i18n.t('categories:fabricItems.shoes.hiking_boots.desc') }, seasons: ['spring','fall','winter'] },
        { id: 'sandals',         get name() { return i18n.t('categories:fabricItems.shoes.sandals.name') },         icon: '🩴', tags: ['rubber','casual'],  get desc() { return i18n.t('categories:fabricItems.shoes.sandals.desc') },        seasons: ['summer'] },
    ],
    scarf: [
        { id: 'wool_scarf',      get name() { return i18n.t('categories:fabricItems.scarf.wool_scarf.name') },      icon: '🧣', tags: ['wool','knit'],     get desc() { return i18n.t('categories:fabricItems.scarf.wool_scarf.desc') },      seasons: ['fall','winter'] },
        { id: 'cashmere_scarf',  get name() { return i18n.t('categories:fabricItems.scarf.cashmere_scarf.name') },  icon: '🧣', tags: ['cashmere','knit'], get desc() { return i18n.t('categories:fabricItems.scarf.cashmere_scarf.desc') },  seasons: ['fall','winter'] },
        { id: 'cotton_scarf',    get name() { return i18n.t('categories:fabricItems.scarf.cotton_scarf.name') },    icon: '🧣', tags: ['cotton','woven'],  get desc() { return i18n.t('categories:fabricItems.scarf.cotton_scarf.desc') },    seasons: ['spring','summer'] },
        { id: 'silk_scarf',      get name() { return i18n.t('categories:fabricItems.scarf.silk_scarf.name') },      icon: '🧣', tags: ['silk','woven'],    get desc() { return i18n.t('categories:fabricItems.scarf.silk_scarf.desc') },      seasons: ['spring','summer','fall'] },
        { id: 'linen_scarf',     get name() { return i18n.t('categories:fabricItems.scarf.linen_scarf.name') },     icon: '🧣', tags: ['linen','woven'],   get desc() { return i18n.t('categories:fabricItems.scarf.linen_scarf.desc') },     seasons: ['spring','summer'] },
    ],
};

// 소재 태그 간 궁합 규칙 (태그 쌍 → 궁합)
// great = 추천, ok = 무난, bad = 비추
export const FABRIC_COMPAT_RULES = [
    // === 클래식 좋은 조합 ===
    { a: 'leather',  b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.leather_denim_great') } },
    { a: 'leather',  b: 'wool',      rating: 'great', get reason() { return i18n.t('categories:compatRules.leather_wool_great') } },
    { a: 'leather',  b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.leather_cotton_great') } },
    { a: 'leather',  b: 'cashmere',  rating: 'great', get reason() { return i18n.t('categories:compatRules.leather_cashmere_great') } },
    { a: 'denim',    b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.denim_cotton_great') } },
    { a: 'denim',    b: 'flannel',   rating: 'great', get reason() { return i18n.t('categories:compatRules.denim_flannel_great') } },
    { a: 'denim',    b: 'wool',      rating: 'great', get reason() { return i18n.t('categories:compatRules.denim_wool_great') } },
    { a: 'wool',     b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.wool_cotton_great') } },
    { a: 'wool',     b: 'silk',      rating: 'great', get reason() { return i18n.t('categories:compatRules.wool_silk_great') } },
    { a: 'wool',     b: 'cashmere',  rating: 'great', get reason() { return i18n.t('categories:compatRules.wool_cashmere_great') } },
    { a: 'linen',    b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.linen_cotton_great') } },
    { a: 'linen',    b: 'linen',     rating: 'great', get reason() { return i18n.t('categories:compatRules.linen_linen_great') } },
    { a: 'cotton',   b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.cotton_cotton_great') } },
    { a: 'cotton',   b: 'jersey',    rating: 'great', get reason() { return i18n.t('categories:compatRules.cotton_jersey_great') } },
    { a: 'suede',    b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.suede_denim_great') } },
    { a: 'suede',    b: 'wool',      rating: 'great', get reason() { return i18n.t('categories:compatRules.suede_wool_great') } },
    { a: 'suede',    b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.suede_cotton_great') } },
    { a: 'suede',    b: 'corduroy',  rating: 'great', get reason() { return i18n.t('categories:compatRules.suede_corduroy_great') } },
    { a: 'tweed',    b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.tweed_cotton_great') } },
    { a: 'tweed',    b: 'wool',      rating: 'great', get reason() { return i18n.t('categories:compatRules.tweed_wool_great') } },
    { a: 'tweed',    b: 'silk',      rating: 'great', get reason() { return i18n.t('categories:compatRules.tweed_silk_great') } },
    { a: 'corduroy', b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.corduroy_cotton_great') } },
    { a: 'corduroy', b: 'wool',      rating: 'great', get reason() { return i18n.t('categories:compatRules.corduroy_wool_great') } },
    { a: 'corduroy', b: 'flannel',   rating: 'great', get reason() { return i18n.t('categories:compatRules.corduroy_flannel_great') } },
    { a: 'corduroy', b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.corduroy_denim_great') } },
    { a: 'waxed',    b: 'wool',      rating: 'great', get reason() { return i18n.t('categories:compatRules.waxed_wool_great') } },
    { a: 'waxed',    b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.waxed_denim_great') } },
    { a: 'waxed',    b: 'corduroy',  rating: 'great', get reason() { return i18n.t('categories:compatRules.waxed_corduroy_great') } },
    { a: 'knit',     b: 'woven',     rating: 'great', get reason() { return i18n.t('categories:compatRules.knit_woven_great') } },
    { a: 'knit',     b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.knit_denim_great') } },
    { a: 'silk',     b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.silk_cotton_great') } },
    { a: 'pique',    b: 'chino',     rating: 'great', get reason() { return i18n.t('categories:compatRules.pique_chino_great') } },
    { a: 'pique',    b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.pique_cotton_great') } },

    // === 무난한 조합 ===
    { a: 'leather',  b: 'leather',   rating: 'ok',    get reason() { return i18n.t('categories:compatRules.leather_leather_ok') } },
    { a: 'leather',  b: 'nylon',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.leather_nylon_ok') } },
    { a: 'leather',  b: 'fleece',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.leather_fleece_ok') } },
    { a: 'denim',    b: 'denim',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.denim_denim_ok') } },
    { a: 'nylon',    b: 'cotton',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.nylon_cotton_ok') } },
    { a: 'nylon',    b: 'nylon',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.nylon_nylon_ok') } },
    { a: 'nylon',    b: 'denim',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.nylon_denim_ok') } },
    { a: 'fleece',   b: 'denim',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.fleece_denim_ok') } },
    { a: 'fleece',   b: 'cotton',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.fleece_cotton_ok') } },
    { a: 'fleece',   b: 'nylon',     rating: 'great', get reason() { return i18n.t('categories:compatRules.fleece_nylon_great') } },
    { a: 'padding',  b: 'cotton',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.padding_cotton_ok') } },
    { a: 'padding',  b: 'denim',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.padding_denim_ok') } },
    { a: 'padding',  b: 'wool',      rating: 'ok',    get reason() { return i18n.t('categories:compatRules.padding_wool_ok') } },
    { a: 'jersey',   b: 'jersey',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.jersey_jersey_ok') } },
    { a: 'jersey',   b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.jersey_denim_great') } },
    { a: 'jersey',   b: 'wool',      rating: 'ok',    get reason() { return i18n.t('categories:compatRules.jersey_wool_ok') } },
    { a: 'synthetic', b: 'cotton',   rating: 'ok',    get reason() { return i18n.t('categories:compatRules.synthetic_cotton_ok') } },
    { a: 'canvas',   b: 'denim',     rating: 'great', get reason() { return i18n.t('categories:compatRules.canvas_denim_great') } },
    { a: 'canvas',   b: 'cotton',    rating: 'great', get reason() { return i18n.t('categories:compatRules.canvas_cotton_great') } },
    { a: 'canvas',   b: 'chino',     rating: 'great', get reason() { return i18n.t('categories:compatRules.canvas_chino_great') } },
    { a: 'rubber',   b: 'cotton',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.rubber_cotton_ok') } },
    { a: 'rubber',   b: 'linen',     rating: 'ok',    get reason() { return i18n.t('categories:compatRules.rubber_linen_ok') } },

    // === 비추 조합 ===
    { a: 'leather',  b: 'linen',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.leather_linen_bad') } },
    { a: 'leather',  b: 'rubber',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.leather_rubber_bad') } },
    { a: 'silk',     b: 'fleece',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.silk_fleece_bad') } },
    { a: 'silk',     b: 'nylon',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.silk_nylon_bad') } },
    { a: 'silk',     b: 'rubber',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.silk_rubber_bad') } },
    { a: 'tweed',    b: 'nylon',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.tweed_nylon_bad') } },
    { a: 'tweed',    b: 'fleece',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.tweed_fleece_bad') } },
    { a: 'tweed',    b: 'jersey',    rating: 'ok',    get reason() { return i18n.t('categories:compatRules.tweed_jersey_ok') } },
    { a: 'cashmere', b: 'nylon',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.cashmere_nylon_bad') } },
    { a: 'cashmere', b: 'fleece',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.cashmere_fleece_bad') } },
    { a: 'cashmere', b: 'rubber',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.cashmere_rubber_bad') } },
    { a: 'formal',   b: 'fleece',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.formal_fleece_bad') } },
    { a: 'formal',   b: 'rubber',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.formal_rubber_bad') } },
    { a: 'formal',   b: 'jersey',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.formal_jersey_bad') } },
    { a: 'semiformal', b: 'fleece',  rating: 'bad',   get reason() { return i18n.t('categories:compatRules.semiformal_fleece_bad') } },
    { a: 'linen',    b: 'wool',      rating: 'bad',   get reason() { return i18n.t('categories:compatRules.linen_wool_bad') } },
    { a: 'linen',    b: 'padding',   rating: 'bad',   get reason() { return i18n.t('categories:compatRules.linen_padding_bad') } },
    { a: 'linen',    b: 'fleece',    rating: 'bad',   get reason() { return i18n.t('categories:compatRules.linen_fleece_bad') } },
    { a: 'linen',    b: 'flannel',   rating: 'bad',   get reason() { return i18n.t('categories:compatRules.linen_flannel_bad') } },
    { a: 'padding',  b: 'silk',      rating: 'bad',   get reason() { return i18n.t('categories:compatRules.padding_silk_bad') } },
    { a: 'padding',  b: 'linen',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.padding_linen_bad') } },
    { a: 'waxed',    b: 'silk',      rating: 'bad',   get reason() { return i18n.t('categories:compatRules.waxed_silk_bad') } },
    { a: 'waxed',    b: 'linen',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.waxed_linen_bad') } },
    { a: 'boots',    b: 'linen',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.boots_linen_bad') } },
    { a: 'boots',    b: 'silk',      rating: 'ok',    get reason() { return i18n.t('categories:compatRules.boots_silk_ok') } },
    { a: 'corduroy', b: 'linen',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.corduroy_linen_bad') } },
    { a: 'flannel',  b: 'linen',     rating: 'bad',   get reason() { return i18n.t('categories:compatRules.flannel_linen_bad') } },
    { a: 'rubber',   b: 'wool',      rating: 'bad',   get reason() { return i18n.t('categories:compatRules.rubber_wool_bad') } },
    { a: 'rubber',   b: 'flannel',   rating: 'bad',   get reason() { return i18n.t('categories:compatRules.rubber_flannel_bad') } },
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
                reason: compat ? compat.reason : i18n.t('categories:compatRules.default_ok')
            });
        }
    }
    return pairs;
}
