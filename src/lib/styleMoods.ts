// @ts-nocheck
// ================================================================
// styleMoods.ts — 스타일-무드별 컬러 추천 매핑
// 원본: 바루픽_최신본.html 2650~4425행 (약 1,776줄)
// ⚠️ 이 데이터는 코디 추천 엔진의 핵심. 값을 변경하지 마세요.
// ================================================================

export const STYLE_MOODS: Record<string, any> = {

    // ════════════════════════════════════════════
    // GROUP A: SEMI-FORMAL (5 styles)
    // ════════════════════════════════════════════

    preppy: {
        nameKo: '프레피', name: 'Preppy', soul: '절제된 화려함, 따뜻한 클래식',
        darks: ['navy', 'charcoal', 'dark_brown', 'olive', 'forest', 'wine', 'burgundy', 'indigo', 'dark_blue',
            'brown', 'espresso', 'dark_olive', 'dark_green', 'midnight', 'hunter_green', 'maroon', 'plum', 'eggplant'],
        mids: ['gray', 'camel', 'khaki', 'taupe', 'slate', 'brown', 'cognac', 'olive', 'moss', 'steel_blue',
            'denim', 'brick', 'terracotta', 'dusty_rose', 'sage', 'mauve', 'sienna', 'tan', 'mustard', 'gold'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'tan', 'powder_blue', 'pastel_sage'],
        pastels: ['pastel_blue', 'pastel_pink', 'pastel_sky', 'pastel_green', 'pastel_yellow', 'pastel_coral',
            'pastel_lavender', 'pastel_mint', 'pastel_peach', 'pastel_lilac', 'pastel_rose', 'pastel_sage', 'pastel_lemon', 'pastel_aqua'],
        accents: ['burgundy', 'red', 'wine', 'forest', 'crimson', 'burnt_orange', 'mustard', 'teal', 'cobalt', 'amber', 'plum'],
        shoes: ['brown', 'dark_brown', 'white', 'black', 'navy', 'burgundy', 'camel', 'cognac', 'espresso', 'tan'],
        tempBias: 'warm'
    },

    ivy: {
        nameKo: '아이비', name: 'Ivy', soul: '전통적 격식, 네이비와 그레이의 구조',
        darks: ['navy', 'charcoal', 'dark_brown', 'midnight', 'dark_blue', 'indigo', 'espresso', 'wine', 'burgundy',
            'forest', 'hunter_green', 'maroon', 'dark_olive'],
        mids: ['gray', 'slate', 'brown', 'cognac', 'camel', 'khaki', 'taupe', 'olive', 'steel_blue', 'denim', 'tan', 'brick', 'sienna'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue'],
        pastels: ['pastel_blue', 'pastel_sky', 'pastel_sage', 'pastel_yellow'],
        accents: ['burgundy', 'wine', 'forest', 'navy', 'crimson', 'mustard', 'cobalt', 'red'],
        shoes: ['brown', 'dark_brown', 'black', 'cognac', 'burgundy', 'espresso', 'navy'],
        tempBias: 'warm'
    },

    dandy: {
        nameKo: '댄디', name: 'Dandy', soul: '세련된 절제, 차분한 우아함',
        darks: ['charcoal', 'navy', 'dark_brown', 'midnight', 'espresso', 'wine', 'burgundy', 'eggplant',
            'dark_blue', 'dark_purple', 'indigo', 'maroon', 'dark_olive'],
        mids: ['gray', 'slate', 'taupe', 'camel', 'cognac', 'brown', 'mauve', 'dusty_rose', 'steel_blue',
            'denim', 'plum', 'moss', 'olive', 'tan', 'sage'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue'],
        pastels: ['pastel_lavender', 'pastel_blue', 'pastel_pink', 'pastel_rose', 'pastel_sage', 'pastel_lilac'],
        accents: ['burgundy', 'wine', 'plum', 'navy', 'forest', 'cobalt', 'mauve', 'eggplant', 'mustard'],
        shoes: ['dark_brown', 'brown', 'black', 'cognac', 'burgundy', 'espresso', 'charcoal'],
        tempBias: 'warm'
    },

    oldmoney: {
        nameKo: '올드머니', name: 'Old Money', soul: '무소음의 고급, 절제된 톤의 깊이',
        darks: ['charcoal', 'navy', 'dark_brown', 'espresso', 'midnight', 'black', 'dark_blue', 'indigo',
            'dark_olive', 'hunter_green', 'wine', 'maroon'],
        mids: ['gray', 'taupe', 'slate', 'camel', 'cognac', 'brown', 'steel_blue', 'olive', 'tan', 'khaki', 'denim'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue'],
        pastels: ['pastel_blue', 'pastel_sage'],
        accents: ['burgundy', 'navy', 'forest', 'camel', 'cobalt'],
        shoes: ['dark_brown', 'brown', 'black', 'cognac', 'espresso', 'navy', 'charcoal', 'white'],
        tempBias: 'neutral'
    },

    ralphlook: {
        nameKo: '랄뽕', name: 'Ralph Look', soul: '폴로의 화려함, 컬러풀한 프레피',
        darks: ['navy', 'charcoal', 'dark_brown', 'forest', 'burgundy', 'wine', 'olive', 'indigo', 'dark_blue',
            'espresso', 'hunter_green', 'maroon', 'dark_olive'],
        mids: ['gray', 'camel', 'khaki', 'brown', 'cognac', 'olive', 'moss', 'sage', 'steel_blue', 'denim',
            'brick', 'terracotta', 'dusty_rose', 'sienna', 'tan', 'mustard', 'gold', 'cobalt'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'tan', 'powder_blue'],
        pastels: ['pastel_blue', 'pastel_pink', 'pastel_sky', 'pastel_green', 'pastel_yellow', 'pastel_coral',
            'pastel_lavender', 'pastel_mint', 'pastel_peach', 'pastel_lilac', 'pastel_rose', 'pastel_sage',
            'pastel_lemon', 'pastel_aqua'],
        accents: ['red', 'burgundy', 'crimson', 'forest', 'cobalt', 'mustard', 'teal', 'amber', 'wine', 'burnt_orange', 'plum', 'orange'],
        shoes: ['brown', 'dark_brown', 'white', 'black', 'navy', 'camel', 'cognac', 'burgundy', 'tan'],
        tempBias: 'warm'
    },

    // ════════════════════════════════════════════
    // GROUP B: CASUAL (5 styles)
    // ════════════════════════════════════════════

    minimal: {
        nameKo: '미니멀', name: 'Minimal', soul: '선과 면의 순수, 노이즈 없는 균형',
        darks: ['black', 'charcoal', 'navy', 'dark_brown', 'midnight', 'dark_blue', 'espresso',
            'dark_olive', 'eggplant', 'dark_purple', 'maroon', 'indigo', 'hunter_green'],
        mids: ['gray', 'taupe', 'slate', 'camel', 'olive', 'brown', 'steel_blue', 'denim',
            'moss', 'sage', 'cognac', 'dusty_rose', 'mauve', 'tan', 'cobalt', 'plum'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue', 'tan'],
        pastels: ['pastel_blue', 'pastel_lavender', 'pastel_pink', 'pastel_sage', 'pastel_lilac', 'pastel_mint', 'pastel_rose'],
        accents: ['camel', 'burgundy', 'navy', 'forest', 'cobalt', 'plum', 'mustard', 'terracotta', 'teal'],
        shoes: ['white', 'black', 'cream', 'brown', 'dark_brown', 'charcoal', 'beige', 'tan', 'cognac', 'navy', 'espresso'],
        tempBias: 'neutral'
    },

    casual: {
        nameKo: '캐주얼', name: 'Casual', soul: '편안한 자유, 데님과 맨투맨의 일상',
        darks: ['navy', 'charcoal', 'dark_brown', 'black', 'forest', 'olive', 'dark_blue', 'indigo',
            'espresso', 'dark_olive', 'wine', 'burgundy', 'midnight', 'hunter_green'],
        mids: ['gray', 'denim', 'khaki', 'camel', 'brown', 'slate', 'tan', 'olive', 'moss', 'sage',
            'cognac', 'steel_blue', 'brick', 'dusty_rose', 'sienna', 'mustard', 'cobalt', 'taupe'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue', 'tan'],
        pastels: ['pastel_blue', 'pastel_pink', 'pastel_sky', 'pastel_green', 'pastel_mint', 'pastel_peach',
            'pastel_yellow', 'pastel_sage', 'pastel_coral', 'pastel_lavender'],
        accents: ['red', 'burgundy', 'mustard', 'cobalt', 'forest', 'teal', 'burnt_orange', 'amber', 'crimson', 'wine'],
        shoes: ['white', 'black', 'brown', 'dark_brown', 'navy', 'cream', 'beige', 'charcoal', 'cognac', 'tan'],
        tempBias: 'balanced'
    },

    cityboy: {
        nameKo: '시티보이', name: 'Cityboy', soul: '밝은 캔버스 위의 청량한 파스텔',
        darks: ['navy', 'charcoal', 'dark_blue', 'olive', 'forest', 'indigo', 'dark_olive', 'hunter_green'],
        mids: ['gray', 'khaki', 'sage', 'moss', 'steel_blue', 'denim', 'slate', 'camel', 'tan', 'dusty_rose', 'mauve', 'cobalt'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue', 'tan'],
        pastels: ['pastel_blue', 'pastel_mint', 'pastel_lavender', 'pastel_peach', 'pastel_pink',
            'pastel_sky', 'pastel_green', 'pastel_aqua', 'pastel_yellow', 'pastel_lilac',
            'pastel_rose', 'pastel_sage', 'pastel_lemon', 'pastel_coral'],
        accents: ['pastel_blue', 'pastel_mint', 'pastel_lavender', 'pastel_pink', 'cobalt', 'teal', 'sage', 'mustard'],
        shoes: ['white', 'cream', 'beige', 'lightgray', 'silver', 'pastel_blue', 'tan'],
        tempBias: 'balanced'
    },

    normcore: {
        nameKo: '놈코어', name: 'Normcore', soul: '의도된 평범, 무지의 힘',
        darks: ['navy', 'charcoal', 'black', 'dark_blue', 'espresso', 'dark_brown', 'midnight'],
        mids: ['gray', 'slate', 'denim', 'taupe', 'khaki', 'olive', 'brown', 'tan', 'steel_blue', 'camel'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver'],
        pastels: ['pastel_blue', 'pastel_sage'],
        accents: ['navy', 'burgundy', 'forest', 'cobalt'],
        shoes: ['white', 'black', 'cream', 'gray', 'brown', 'navy', 'charcoal', 'beige'],
        tempBias: 'neutral'
    },

    athleisure: {
        nameKo: '애슬레저', name: 'Athleisure', soul: '스포츠와 일상의 경계, 기능적 컬러',
        darks: ['black', 'charcoal', 'navy', 'dark_blue', 'midnight', 'dark_olive', 'espresso',
            'dark_green', 'hunter_green', 'indigo'],
        mids: ['gray', 'slate', 'olive', 'steel_blue', 'denim', 'cobalt', 'taupe', 'moss', 'brown'],
        lights: ['white', 'cream', 'lightgray', 'silver', 'ivory'],
        pastels: ['pastel_mint', 'pastel_sage', 'pastel_blue', 'pastel_sky'],
        accents: ['cobalt', 'crimson', 'teal', 'burnt_orange', 'amber', 'red', 'orange'],
        shoes: ['white', 'black', 'charcoal', 'navy', 'cream', 'gray'],
        tempBias: 'neutral'
    },

    // ════════════════════════════════════════════
    // GROUP C: WORK/OUTDOOR (5 styles)
    // ════════════════════════════════════════════

    amekaji: {
        nameKo: '아메카지', name: 'Amekaji', soul: '경년변화의 깊이, 흙과 가죽의 따뜻함',
        darks: ['dark_brown', 'brown', 'espresso', 'chocolate', 'burgundy', 'navy', 'forest', 'dark_olive',
            'wine', 'indigo', 'maroon', 'hunter_green', 'dark_green', 'charcoal', 'dark_blue', 'midnight'],
        mids: ['brown', 'cognac', 'olive', 'camel', 'khaki', 'rust', 'sienna', 'brick', 'terracotta',
            'taupe', 'moss', 'sage', 'denim', 'tan', 'mustard', 'amber', 'gold', 'gray', 'slate', 'dusty_rose'],
        lights: ['cream', 'ivory', 'beige', 'white', 'tan', 'khaki', 'lightgray'],
        pastels: [],
        accents: ['red', 'burgundy', 'wine', 'crimson', 'burnt_orange', 'rust', 'mustard', 'amber', 'forest', 'teal'],
        shoes: ['brown', 'dark_brown', 'cognac', 'espresso', 'tan', 'black', 'burgundy', 'rust'],
        tempBias: 'warm'
    },

    workwear: {
        nameKo: '워크웨어', name: 'Workwear', soul: '노동의 견고함, 캔버스와 데님의 무게',
        darks: ['dark_brown', 'charcoal', 'navy', 'espresso', 'chocolate', 'dark_olive', 'forest',
            'indigo', 'brown', 'hunter_green', 'midnight', 'black', 'maroon'],
        mids: ['brown', 'cognac', 'olive', 'khaki', 'denim', 'taupe', 'rust', 'sienna', 'brick',
            'camel', 'tan', 'moss', 'gray', 'slate', 'mustard', 'amber', 'terracotta'],
        lights: ['cream', 'ivory', 'beige', 'white', 'tan', 'khaki', 'lightgray'],
        pastels: [],
        accents: ['rust', 'burgundy', 'red', 'mustard', 'burnt_orange', 'amber', 'crimson', 'forest'],
        shoes: ['brown', 'dark_brown', 'black', 'cognac', 'espresso', 'tan', 'rust'],
        tempBias: 'warm'
    },

    military: {
        nameKo: '밀리터리', name: 'Military', soul: '위장과 기능, 올리브와 카키의 절제',
        darks: ['dark_olive', 'charcoal', 'black', 'navy', 'forest', 'hunter_green', 'dark_green',
            'espresso', 'midnight', 'dark_brown', 'dark_blue', 'brown'],
        mids: ['olive', 'khaki', 'gray', 'slate', 'moss', 'denim', 'taupe', 'brown', 'sage',
            'tan', 'camel', 'steel_blue', 'rust', 'brick', 'sienna', 'cobalt'],
        lights: ['cream', 'ivory', 'beige', 'white', 'khaki', 'tan', 'lightgray'],
        pastels: [],
        accents: ['rust', 'burgundy', 'burnt_orange', 'crimson', 'mustard', 'teal', 'amber'],
        shoes: ['black', 'dark_brown', 'brown', 'espresso', 'dark_olive', 'charcoal', 'tan'],
        tempBias: 'warm'
    },

    british: {
        nameKo: '브리티시', name: 'British Heritage', soul: '전원과 도시의 만남, 트위드와 왁스의 품격',
        darks: ['charcoal', 'navy', 'dark_brown', 'espresso', 'forest', 'hunter_green', 'wine', 'burgundy',
            'dark_olive', 'midnight', 'indigo', 'dark_blue', 'maroon', 'dark_green'],
        mids: ['brown', 'cognac', 'olive', 'camel', 'khaki', 'taupe', 'gray', 'slate', 'moss', 'sage',
            'brick', 'sienna', 'denim', 'tan', 'steel_blue', 'dusty_rose', 'rust', 'terracotta', 'mustard'],
        lights: ['cream', 'ivory', 'beige', 'white', 'lightgray', 'tan', 'powder_blue'],
        pastels: ['pastel_sage', 'pastel_blue'],
        accents: ['burgundy', 'wine', 'forest', 'hunter_green', 'mustard', 'teal', 'burnt_orange', 'crimson', 'cobalt', 'plum'],
        shoes: ['dark_brown', 'brown', 'cognac', 'black', 'espresso', 'burgundy', 'tan'],
        tempBias: 'warm'
    },

    gorpcore: {
        nameKo: '고프코어', name: 'Gorpcore', soul: '자연과 도시의 융합, 아웃도어 컬러의 일상화',
        darks: ['dark_olive', 'charcoal', 'navy', 'forest', 'hunter_green', 'dark_green', 'black',
            'espresso', 'dark_brown', 'midnight', 'dark_blue', 'indigo'],
        mids: ['olive', 'khaki', 'moss', 'sage', 'denim', 'gray', 'slate', 'camel', 'brown', 'tan',
            'steel_blue', 'cobalt', 'taupe', 'rust', 'brick', 'sienna', 'terracotta', 'mustard', 'amber'],
        lights: ['cream', 'ivory', 'beige', 'white', 'lightgray', 'tan', 'powder_blue', 'silver'],
        pastels: ['pastel_sage', 'pastel_mint', 'pastel_green', 'pastel_aqua', 'pastel_blue', 'pastel_sky'],
        accents: ['cobalt', 'teal', 'burnt_orange', 'crimson', 'amber', 'mustard', 'rust', 'orange', 'forest', 'red'],
        shoes: ['brown', 'dark_brown', 'black', 'charcoal', 'dark_olive', 'tan', 'espresso', 'cream'],
        tempBias: 'warm'
    },

    // ════════════════════════════════════════════
    // GROUP D: STREET (5 styles)
    // ════════════════════════════════════════════

    street: {
        nameKo: '스트릿', name: 'Street', soul: '자유와 반항, 그래픽과 볼드 컬러',
        darks: ['black', 'charcoal', 'navy', 'dark_blue', 'midnight', 'dark_olive', 'espresso',
            'dark_brown', 'indigo', 'dark_green', 'dark_purple', 'maroon', 'hunter_green'],
        mids: ['gray', 'olive', 'denim', 'slate', 'brown', 'cobalt', 'steel_blue', 'khaki', 'tan',
            'camel', 'moss', 'sage', 'dusty_rose', 'brick', 'taupe', 'mustard', 'terracotta'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver'],
        pastels: ['pastel_blue', 'pastel_pink', 'pastel_mint', 'pastel_lavender', 'pastel_sky',
            'pastel_yellow', 'pastel_coral', 'pastel_lilac'],
        accents: ['red', 'crimson', 'cobalt', 'teal', 'orange', 'burnt_orange', 'amber', 'mustard',
            'burgundy', 'purple', 'forest'],
        shoes: ['white', 'black', 'cream', 'charcoal', 'brown', 'navy', 'dark_brown', 'beige'],
        tempBias: 'balanced'
    },

    grunge: {
        nameKo: '그런지', name: 'Grunge', soul: '퇴폐적 무심함, 어두운 플란넬과 데님',
        darks: ['black', 'charcoal', 'dark_brown', 'espresso', 'navy', 'dark_olive', 'midnight',
            'maroon', 'wine', 'burgundy', 'dark_blue', 'eggplant', 'dark_purple', 'dark_green', 'hunter_green'],
        mids: ['gray', 'olive', 'denim', 'taupe', 'slate', 'brown', 'moss', 'brick', 'rust',
            'sienna', 'dusty_rose', 'cognac', 'khaki', 'dark_olive', 'plum', 'mauve', 'terracotta', 'mustard'],
        lights: ['cream', 'ivory', 'white', 'beige', 'lightgray'],
        pastels: [],
        accents: ['burgundy', 'wine', 'rust', 'crimson', 'burnt_orange', 'plum', 'mustard', 'maroon', 'red'],
        shoes: ['black', 'dark_brown', 'brown', 'charcoal', 'espresso', 'burgundy'],
        tempBias: 'warm'
    },

    contemporary: {
        nameKo: '컨템포러리', name: 'Contemporary', soul: '구조적 실루엣, 지적인 톤의 실험',
        darks: ['black', 'charcoal', 'navy', 'midnight', 'dark_brown', 'espresso', 'dark_blue',
            'dark_olive', 'eggplant', 'dark_purple', 'indigo', 'hunter_green', 'maroon'],
        mids: ['gray', 'slate', 'taupe', 'camel', 'olive', 'steel_blue', 'denim', 'cognac',
            'moss', 'sage', 'brown', 'mauve', 'dusty_rose', 'plum', 'cobalt', 'tan', 'mustard'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue'],
        pastels: ['pastel_blue', 'pastel_lavender', 'pastel_sage', 'pastel_mint', 'pastel_pink',
            'pastel_lilac', 'pastel_rose'],
        accents: ['cobalt', 'burgundy', 'teal', 'plum', 'forest', 'mustard', 'terracotta', 'eggplant', 'mauve'],
        shoes: ['black', 'white', 'dark_brown', 'charcoal', 'cream', 'cognac', 'brown', 'navy', 'espresso', 'beige'],
        tempBias: 'neutral'
    },

    techwear: {
        nameKo: '테크웨어', name: 'Techwear', soul: '무채색의 기능, 그림자의 질감',
        darks: ['black', 'charcoal', 'dark_blue', 'navy', 'midnight', 'dark_olive', 'dark_green', 'hunter_green',
            'forest', 'indigo', 'slate', 'eggplant', 'dark_purple'],
        mids: ['gray', 'olive', 'slate', 'steel_blue', 'denim', 'moss', 'dark_olive', 'cobalt', 'taupe', 'espresso'],
        lights: ['white', 'cream', 'lightgray', 'silver', 'powder_blue'],
        pastels: ['pastel_sage', 'pastel_mint'],
        accents: ['olive', 'teal', 'cobalt', 'burnt_orange', 'crimson'],
        shoes: ['black', 'charcoal', 'dark_brown', 'espresso', 'dark_olive', 'navy', 'slate'],
        tempBias: 'neutral'
    },

    genderless: {
        nameKo: '젠더리스', name: 'Genderless', soul: '경계 없는 실루엣, 뉴트럴과 파스텔의 부드러움',
        darks: ['charcoal', 'navy', 'black', 'dark_brown', 'midnight', 'espresso', 'dark_blue',
            'dark_olive', 'eggplant', 'dark_purple', 'indigo', 'hunter_green'],
        mids: ['gray', 'taupe', 'slate', 'camel', 'olive', 'denim', 'sage', 'moss', 'steel_blue',
            'dusty_rose', 'mauve', 'brown', 'cognac', 'tan', 'plum', 'cobalt', 'mustard'],
        lights: ['white', 'cream', 'ivory', 'beige', 'lightgray', 'silver', 'powder_blue', 'tan'],
        pastels: ['pastel_lavender', 'pastel_pink', 'pastel_blue', 'pastel_sage', 'pastel_mint',
            'pastel_lilac', 'pastel_rose', 'pastel_peach', 'pastel_sky', 'pastel_aqua', 'pastel_yellow'],
        accents: ['mauve', 'plum', 'cobalt', 'teal', 'dusty_rose', 'mustard', 'burgundy', 'sage', 'terracotta'],
        shoes: ['white', 'black', 'cream', 'charcoal', 'brown', 'beige', 'tan', 'dark_brown', 'cognac'],
        tempBias: 'neutral'
    },
};

