// ================================================================
// outfits.ts — 1단계 "옷 조합 선택" 데이터와 순위 계산
//
// 색보다 옷을 먼저 고른다 (대표님 결정 2026-09-08: 주인공은 옷의 실제 디자인).
// 상황 40 · 날씨 25 · 취향 20 · 최근 회피 10 으로 48벌 조합을 줄 세우고,
// 1위 한 벌 + 방향 칩(옷 한 벌만 바꾼 이웃) + 축이 다른 대안 3장을 보여 준다.
// 근거: 바루픽_옷조합_선택_연구.md, 목업 flow-v3. 판 이름·칸 표는
// public/char/catalog3.json 에서 구운 것이다 (손으로 고치지 않는다).
// ================================================================
import i18n from '@/i18n'

export type Situ = 'work' | 'daily' | 'date' | 'formal' | 'active' | 'home'
export type Part = 'outer' | 'layer' | 'top' | 'bottom' | 'shoes'
export type Parts = Partial<Record<Part, string>>
export interface Template { id: string; tag: Situ; st: string; p: Parts; w: Parts | null; pal: Record<string, string> }
export interface Score { situ: number; weather: number; taste: number; recent: number; dis: number; total: number; f: number; w: number; ov: number }
export interface Entry { c: Template; p: Parts; s: Score; chg?: Part; from?: string; to?: string; name?: string; why?: string; gen?: boolean }
export interface Prefs { likes: Record<string, number>; likedStyles: Record<string, number>; dislikes: string[] }
export interface Ctx { sex: 'm' | 'w'; situ: Situ; temp: number; prefs: Prefs; recent: { id: string; ago: number }[]; anchor?: string | null }

export const PARTS: Part[] = ['outer', 'layer', 'top', 'bottom', 'shoes']
export const SITU: { id: Situ; range: [number, number] }[] = [
  { id: 'work', range: [3, 4.6] }, { id: 'daily', range: [1.5, 3.5] }, { id: 'date', range: [2.5, 4] },
  { id: 'formal', range: [3.8, 5] }, { id: 'active', range: [1, 2.6] }, { id: 'home', range: [1, 2.6] },
]
/** 조합 카드의 중립색 — 옷 모양이 주인공이라 색은 죽인다. 바뀐 옷만 CHG 로 살짝 띄운다. */
export const NEU: Record<Part, string> = { outer: '#9A948C', layer: '#C4BDB3', top: '#ECE7DF', bottom: '#4B4844', shoes: '#2A2825' }
export const CHG = '#7A6A5A'
const DEFPAL: Record<Part, string> = { outer: 'camel', layer: 'beige', top: 'white', bottom: 'charcoal', shoes: 'black' }

/** 판 id → 이름 (catalog3.json ko · 컬러랩 en.json) */
export const PLATE_NAMES: Record<string, { ko: string; en: string }> = {
  "01_denim_straight": {
    "ko": "일자 데님",
    "en": "Straight denim"
  },
  "02_denim_wide": {
    "ko": "와이드 데님",
    "en": "Wide denim"
  },
  "03_slacks_straight": {
    "ko": "일자 슬랙스",
    "en": "Straight slacks"
  },
  "04_slacks_wide": {
    "ko": "와이드 슬랙스",
    "en": "Wide slacks"
  },
  "05_shorts": {
    "ko": "반바지",
    "en": "Shorts"
  },
  "06_tee_short": {
    "ko": "반팔 티",
    "en": "T-shirt"
  },
  "07_tee_long": {
    "ko": "긴팔 티",
    "en": "Long-sleeve tee"
  },
  "08_shirt_closed": {
    "ko": "셔츠",
    "en": "Shirt"
  },
  "09_shirt_short": {
    "ko": "반팔 셔츠",
    "en": "Short-sleeve shirt"
  },
  "10_shirt_open": {
    "ko": "오픈 셔츠",
    "en": "Open shirt"
  },
  "11_knit_crew": {
    "ko": "크루넥 니트",
    "en": "Crewneck knit"
  },
  "12_knit_vneck": {
    "ko": "브이넥 니트",
    "en": "V-neck knit"
  },
  "13_knit_turtle": {
    "ko": "목폴라",
    "en": "Turtleneck"
  },
  "14_knit_vest": {
    "ko": "니트 베스트",
    "en": "Knit vest"
  },
  "15_cardigan": {
    "ko": "가디건",
    "en": "Cardigan"
  },
  "16_hoodie": {
    "ko": "후드티",
    "en": "Hoodie"
  },
  "17_coat_long": {
    "ko": "롱코트",
    "en": "Long coat"
  },
  "18_jacket_short": {
    "ko": "블루종",
    "en": "Blouson"
  },
  "19_blazer": {
    "ko": "블레이저",
    "en": "Blazer"
  },
  "20_leather": {
    "ko": "라이더 자켓",
    "en": "Biker jacket"
  },
  "21_windbreaker": {
    "ko": "윈드브레이커",
    "en": "Windbreaker"
  },
  "22_sukajan": {
    "ko": "스카잔",
    "en": "Souvenir jacket"
  },
  "28_coat_short": {
    "ko": "숏코트",
    "en": "Short coat"
  },
  "29_puffer": {
    "ko": "숏 패딩",
    "en": "Puffer jacket"
  },
  "30_trench": {
    "ko": "트렌치코트",
    "en": "Trench coat"
  },
  "31_trucker": {
    "ko": "데님 자켓",
    "en": "Denim jacket"
  },
  "32_padding_long": {
    "ko": "롱 패딩",
    "en": "Long puffer"
  },
  "35_sweat": {
    "ko": "맨투맨",
    "en": "Sweatshirt"
  },
  "36_tank": {
    "ko": "민소매 탑",
    "en": "Tank top"
  },
  "37_polo": {
    "ko": "폴로 셔츠",
    "en": "Polo shirt"
  },
  "38_denim_slim": {
    "ko": "슬림 데님",
    "en": "Slim denim"
  },
  "39_cargo": {
    "ko": "카고 팬츠",
    "en": "Cargo trousers"
  },
  "40_track": {
    "ko": "트레이닝 팬츠",
    "en": "Track pants"
  },
  "41_jacket_crop": {
    "ko": "크롭 자켓",
    "en": "Cropped jacket"
  },
  "42_fleece": {
    "ko": "플리스",
    "en": "Fleece jacket"
  },
  "43_mustang": {
    "ko": "무스탕",
    "en": "Shearling jacket"
  },
  "44_field": {
    "ko": "야상",
    "en": "Field jacket"
  },
  "45_vest_padding": {
    "ko": "패딩 조끼",
    "en": "Padded vest"
  },
  "53_halfzip": {
    "ko": "하프집업",
    "en": "Half-zip"
  },
  "54_scarf": {
    "ko": "롱 머플러",
    "en": "Long muffler"
  },
  "55_snood": {
    "ko": "스누드",
    "en": "Snood"
  },
  "56_scarf_silk": {
    "ko": "실크 스카프",
    "en": "Silk scarf"
  },
  "57_scarf_cable": {
    "ko": "케이블 머플러",
    "en": "Cable Scarf"
  },
  "58_scarf_blanket": {
    "ko": "블랭킷 스카프",
    "en": "Blanket Scarf"
  },
  "59_tie": {
    "ko": "넥타이",
    "en": "Necktie"
  },
  "60_denim_barrel": {
    "ko": "배럴 데님",
    "en": "Barrel Jeans"
  },
  "61_pants_balloon": {
    "ko": "벌룬 팬츠",
    "en": "Balloon Trousers"
  },
  "62_denim_boot": {
    "ko": "부츠컷 데님",
    "en": "Bootcut Jeans"
  },
  "63_chino": {
    "ko": "치노 팬츠",
    "en": "Chinos"
  },
  "64_corduroy": {
    "ko": "코듀로이 팬츠",
    "en": "Corduroy Trousers"
  },
  "65_overall": {
    "ko": "오버올",
    "en": "Dungarees"
  },
  "70_socks": {
    "ko": "양말",
    "en": "Socks"
  },
  "71_sneaker_canvas": {
    "ko": "캔버스 스니커즈",
    "en": "Canvas Sneakers"
  },
  "72_sneaker_runner": {
    "ko": "러닝화",
    "en": "Running Shoes"
  },
  "73_sneaker_chunky": {
    "ko": "청키 스니커즈",
    "en": "Chunky Sneakers"
  },
  "74_loafer": {
    "ko": "로퍼",
    "en": "Loafers"
  },
  "75_boots_chelsea": {
    "ko": "첼시 부츠",
    "en": "Chelsea Boots"
  },
  "76_boots_walker": {
    "ko": "워커",
    "en": "Lace-up Boots"
  },
  "77_derby": {
    "ko": "더비 슈즈",
    "en": "Derby Shoes"
  },
  "80_sandal_slide": {
    "ko": "슬라이드 샌들",
    "en": "Slide Sandals"
  },
  "81_boots_ugg": {
    "ko": "어그 부츠",
    "en": "Sheepskin Boots"
  },
  "23_skirt_wrap": {
    "ko": "랩 스커트",
    "en": "Wrap skirt"
  },
  "24_skirt_pleat": {
    "ko": "플리츠 스커트",
    "en": "Pleated skirt"
  },
  "25_skirt_denim": {
    "ko": "데님 미니",
    "en": "Denim skirt"
  },
  "26_dress_shirt": {
    "ko": "셔츠 원피스",
    "en": "Shirt dress"
  },
  "27_dress_knit": {
    "ko": "니트 원피스",
    "en": "Knit dress"
  },
  "34_skirt_knit": {
    "ko": "니트 스커트",
    "en": "Ribbed knit skirt"
  },
  "46_knit_crop": {
    "ko": "크롭 니트",
    "en": "Cropped knit"
  },
  "47_blouse": {
    "ko": "블라우스",
    "en": "Blouse"
  },
  "48_skirt_mini": {
    "ko": "미니 스커트",
    "en": "Mini skirt"
  },
  "49_skirt_long": {
    "ko": "롱 스커트",
    "en": "Maxi skirt"
  },
  "50_leggings": {
    "ko": "레깅스",
    "en": "Leggings"
  },
  "51_dress_mini": {
    "ko": "미니 원피스",
    "en": "Mini dress"
  },
  "52_jumpsuit": {
    "ko": "점프수트",
    "en": "Jumpsuit"
  },
  "78_flats_ballet": {
    "ko": "발레리나 플랫",
    "en": "Ballet Flats"
  },
  "79_maryjane": {
    "ko": "메리제인",
    "en": "Mary Janes"
  },
  "82_boots_long": {
    "ko": "롱부츠",
    "en": "Knee-high Boots"
  }
}

/** 판 id → 렌더러 칸 */
export const PLATE_SLOT: Record<string, string> = {
  "01_denim_straight": "bottom",
  "02_denim_wide": "bottom",
  "03_slacks_straight": "bottom",
  "04_slacks_wide": "bottom",
  "05_shorts": "bottom",
  "06_tee_short": "inner",
  "07_tee_long": "inner",
  "08_shirt_closed": "mid1",
  "09_shirt_short": "mid1",
  "10_shirt_open": "mid2",
  "11_knit_crew": "mid1",
  "12_knit_vneck": "mid1",
  "13_knit_turtle": "inner",
  "14_knit_vest": "mid2",
  "15_cardigan": "mid2",
  "16_hoodie": "mid1",
  "17_coat_long": "outer",
  "18_jacket_short": "outer",
  "19_blazer": "outer",
  "20_leather": "outer",
  "21_windbreaker": "outer",
  "22_sukajan": "outer",
  "28_coat_short": "outer",
  "29_puffer": "outer",
  "30_trench": "outer",
  "31_trucker": "outer",
  "32_padding_long": "outer",
  "35_sweat": "mid1",
  "36_tank": "inner",
  "37_polo": "mid1",
  "38_denim_slim": "bottom",
  "39_cargo": "bottom",
  "40_track": "bottom",
  "41_jacket_crop": "outer",
  "42_fleece": "outer",
  "43_mustang": "outer",
  "44_field": "outer",
  "45_vest_padding": "mid2",
  "53_halfzip": "mid1",
  "54_scarf": "scarf",
  "55_snood": "scarf",
  "56_scarf_silk": "scarf",
  "57_scarf_cable": "scarf",
  "58_scarf_blanket": "scarf",
  "59_tie": "tie",
  "60_denim_barrel": "bottom",
  "61_pants_balloon": "bottom",
  "62_denim_boot": "bottom",
  "63_chino": "bottom",
  "64_corduroy": "bottom",
  "65_overall": "dress",
  "70_socks": "sock",
  "71_sneaker_canvas": "shoe",
  "72_sneaker_runner": "shoe",
  "73_sneaker_chunky": "shoe",
  "74_loafer": "shoe",
  "75_boots_chelsea": "shoe",
  "76_boots_walker": "shoe",
  "77_derby": "shoe",
  "80_sandal_slide": "shoe",
  "81_boots_ugg": "shoe",
  "23_skirt_wrap": "bottom",
  "24_skirt_pleat": "bottom",
  "25_skirt_denim": "bottom",
  "26_dress_shirt": "dress",
  "27_dress_knit": "dress",
  "34_skirt_knit": "bottom",
  "46_knit_crop": "mid1",
  "47_blouse": "mid1",
  "48_skirt_mini": "bottom",
  "49_skirt_long": "bottom",
  "50_leggings": "bottom",
  "51_dress_mini": "dress",
  "52_jumpsuit": "dress",
  "78_flats_ballet": "shoe",
  "79_maryjane": "shoe",
  "82_boots_long": "shoe"
}

export const FEMALE_ONLY = new Set<string>(["23_skirt_wrap", "24_skirt_pleat", "25_skirt_denim", "26_dress_shirt", "27_dress_knit", "34_skirt_knit", "46_knit_crop", "47_blouse", "48_skirt_mini", "49_skirt_long", "50_leggings", "51_dress_mini", "52_jumpsuit", "78_flats_ballet", "79_maryjane", "82_boots_long"])

/** 격식도 1~5 */
const F: Record<string, number> = {
  "19_blazer": 4,
  "30_trench": 4,
  "17_coat_long": 4,
  "28_coat_short": 3.5,
  "31_trucker": 2,
  "29_puffer": 1.5,
  "15_cardigan": 3,
  "14_knit_vest": 3.5,
  "10_shirt_open": 2.5,
  "45_vest_padding": 1.5,
  "08_shirt_closed": 4,
  "09_shirt_short": 3,
  "11_knit_crew": 3,
  "12_knit_vneck": 3.5,
  "13_knit_turtle": 3.5,
  "35_sweat": 2,
  "16_hoodie": 1.5,
  "37_polo": 3,
  "07_tee_long": 2,
  "06_tee_short": 1.5,
  "36_tank": 1,
  "03_slacks_straight": 4,
  "04_slacks_wide": 3.5,
  "63_chino": 3,
  "01_denim_straight": 2.5,
  "02_denim_wide": 2,
  "60_denim_barrel": 2,
  "61_pants_balloon": 2,
  "39_cargo": 1.5,
  "24_skirt_pleat": 3,
  "49_skirt_long": 3,
  "74_loafer": 3.5,
  "77_derby": 4,
  "75_boots_chelsea": 3.5,
  "76_boots_walker": 2.5,
  "71_sneaker_canvas": 2,
  "73_sneaker_chunky": 1.5,
  "78_flats_ballet": 3,
  "59_tie": 5
}

/** 보온 */
const W: Record<string, number> = {
  "29_puffer": 3,
  "17_coat_long": 3,
  "28_coat_short": 2.5,
  "30_trench": 2,
  "19_blazer": 1.5,
  "31_trucker": 1.5,
  "15_cardigan": 1,
  "14_knit_vest": 0.7,
  "10_shirt_open": 0.5,
  "45_vest_padding": 1.5,
  "13_knit_turtle": 1.2,
  "11_knit_crew": 1,
  "12_knit_vneck": 0.9,
  "35_sweat": 1,
  "16_hoodie": 1,
  "08_shirt_closed": 0.6,
  "09_shirt_short": 0.3,
  "37_polo": 0.4,
  "07_tee_long": 0.5,
  "06_tee_short": 0.2,
  "36_tank": 0.1
}

/** 조합 48벌: id · 상황 · 스타일 · 옷 · 여성 치환 · 추천 팔레트(바루픽 색 키) */
export const TEMPLATES: Template[] = [
  {
    "id": "w1",
    "tag": "work",
    "st": "아이비",
    "p": {
      "outer": "19_blazer",
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "outer": "navy",
      "top": "white",
      "bottom": "beige",
      "shoes": "brown"
    }
  },
  {
    "id": "w2",
    "tag": "work",
    "st": "댄디",
    "p": {
      "outer": "30_trench",
      "top": "11_knit_crew",
      "bottom": "03_slacks_straight",
      "shoes": "75_boots_chelsea"
    },
    "w": null,
    "pal": {
      "outer": "camel",
      "top": "charcoal",
      "bottom": "charcoal",
      "shoes": "black"
    }
  },
  {
    "id": "w3",
    "tag": "work",
    "st": "미니멀",
    "p": {
      "top": "08_shirt_closed",
      "bottom": "04_slacks_wide",
      "shoes": "77_derby"
    },
    "w": {
      "shoes": "78_flats_ballet"
    },
    "pal": {
      "top": "ivory",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "w4",
    "tag": "work",
    "st": "올드머니",
    "p": {
      "layer": "15_cardigan",
      "top": "08_shirt_closed",
      "bottom": "63_chino",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "layer": "camel",
      "top": "white",
      "bottom": "khaki",
      "shoes": "brown"
    }
  },
  {
    "id": "w5",
    "tag": "work",
    "st": "프레피",
    "p": {
      "layer": "14_knit_vest",
      "top": "08_shirt_closed",
      "bottom": "63_chino",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "layer": "navy",
      "top": "white",
      "bottom": "beige",
      "shoes": "brown"
    }
  },
  {
    "id": "w6",
    "tag": "work",
    "st": "시티보이",
    "p": {
      "layer": "10_shirt_open",
      "top": "07_tee_long",
      "bottom": "02_denim_wide",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "layer": "sage",
      "top": "white",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "w7",
    "tag": "work",
    "st": "컨템포러리",
    "p": {
      "outer": "19_blazer",
      "top": "13_knit_turtle",
      "bottom": "04_slacks_wide",
      "shoes": "77_derby"
    },
    "w": null,
    "pal": {
      "outer": "charcoal",
      "top": "black",
      "bottom": "charcoal",
      "shoes": "black"
    }
  },
  {
    "id": "w8",
    "tag": "work",
    "st": "놈코어",
    "p": {
      "top": "12_knit_vneck",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "top": "gray",
      "bottom": "navy",
      "shoes": "black"
    }
  },
  {
    "id": "w9",
    "tag": "work",
    "st": "브리티시",
    "p": {
      "outer": "28_coat_short",
      "top": "08_shirt_closed",
      "bottom": "63_chino",
      "shoes": "75_boots_chelsea"
    },
    "w": null,
    "pal": {
      "outer": "olive",
      "top": "cream",
      "bottom": "camel",
      "shoes": "brown"
    }
  },
  {
    "id": "d1",
    "tag": "daily",
    "st": "캐주얼",
    "p": {
      "top": "35_sweat",
      "bottom": "01_denim_straight",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "gray",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "d2",
    "tag": "daily",
    "st": "시티보이",
    "p": {
      "layer": "10_shirt_open",
      "top": "06_tee_short",
      "bottom": "02_denim_wide",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "layer": "beige",
      "top": "white",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "d3",
    "tag": "daily",
    "st": "놈코어",
    "p": {
      "top": "11_knit_crew",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "top": "ivory",
      "bottom": "charcoal",
      "shoes": "black"
    }
  },
  {
    "id": "d4",
    "tag": "daily",
    "st": "아메카지",
    "p": {
      "outer": "31_trucker",
      "top": "35_sweat",
      "bottom": "63_chino",
      "shoes": "76_boots_walker"
    },
    "w": null,
    "pal": {
      "outer": "denim",
      "top": "cream",
      "bottom": "khaki",
      "shoes": "brown"
    }
  },
  {
    "id": "d5",
    "tag": "daily",
    "st": "미니멀",
    "p": {
      "top": "12_knit_vneck",
      "bottom": "04_slacks_wide",
      "shoes": "77_derby"
    },
    "w": {
      "bottom": "49_skirt_long",
      "shoes": "78_flats_ballet"
    },
    "pal": {
      "top": "black",
      "bottom": "gray",
      "shoes": "black"
    }
  },
  {
    "id": "d6",
    "tag": "daily",
    "st": "스트릿",
    "p": {
      "top": "16_hoodie",
      "bottom": "39_cargo",
      "shoes": "73_sneaker_chunky"
    },
    "w": null,
    "pal": {
      "top": "black",
      "bottom": "olive",
      "shoes": "white"
    }
  },
  {
    "id": "d7",
    "tag": "daily",
    "st": "캐주얼",
    "p": {
      "layer": "15_cardigan",
      "top": "06_tee_short",
      "bottom": "01_denim_straight",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "layer": "navy",
      "top": "white",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "d8",
    "tag": "daily",
    "st": "프레피",
    "p": {
      "top": "37_polo",
      "bottom": "63_chino",
      "shoes": "74_loafer"
    },
    "w": {
      "bottom": "24_skirt_pleat"
    },
    "pal": {
      "top": "navy",
      "bottom": "beige",
      "shoes": "brown"
    }
  },
  {
    "id": "d9",
    "tag": "daily",
    "st": "고프코어",
    "p": {
      "layer": "45_vest_padding",
      "top": "07_tee_long",
      "bottom": "39_cargo",
      "shoes": "76_boots_walker"
    },
    "w": null,
    "pal": {
      "layer": "black",
      "top": "gray",
      "bottom": "khaki",
      "shoes": "black"
    }
  },
  {
    "id": "t1",
    "tag": "date",
    "st": "댄디",
    "p": {
      "outer": "28_coat_short",
      "top": "13_knit_turtle",
      "bottom": "03_slacks_straight",
      "shoes": "75_boots_chelsea"
    },
    "w": null,
    "pal": {
      "outer": "camel",
      "top": "black",
      "bottom": "charcoal",
      "shoes": "black"
    }
  },
  {
    "id": "t2",
    "tag": "date",
    "st": "미니멀",
    "p": {
      "top": "08_shirt_closed",
      "bottom": "04_slacks_wide",
      "shoes": "74_loafer"
    },
    "w": {
      "bottom": "49_skirt_long",
      "shoes": "78_flats_ballet"
    },
    "pal": {
      "top": "white",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "t3",
    "tag": "date",
    "st": "시티보이",
    "p": {
      "layer": "15_cardigan",
      "top": "07_tee_long",
      "bottom": "60_denim_barrel",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "layer": "sage",
      "top": "ivory",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "t4",
    "tag": "date",
    "st": "컨템포러리",
    "p": {
      "outer": "19_blazer",
      "top": "13_knit_turtle",
      "bottom": "04_slacks_wide",
      "shoes": "77_derby"
    },
    "w": null,
    "pal": {
      "outer": "black",
      "top": "charcoal",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "t5",
    "tag": "date",
    "st": "캐주얼",
    "p": {
      "top": "11_knit_crew",
      "bottom": "01_denim_straight",
      "shoes": "74_loafer"
    },
    "w": {
      "bottom": "24_skirt_pleat",
      "shoes": "78_flats_ballet"
    },
    "pal": {
      "top": "burgundy",
      "bottom": "denim",
      "shoes": "brown"
    }
  },
  {
    "id": "t6",
    "tag": "date",
    "st": "올드머니",
    "p": {
      "layer": "14_knit_vest",
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "layer": "cream",
      "top": "white",
      "bottom": "navy",
      "shoes": "brown"
    }
  },
  {
    "id": "t7",
    "tag": "date",
    "st": "브리티시",
    "p": {
      "outer": "30_trench",
      "top": "11_knit_crew",
      "bottom": "01_denim_straight",
      "shoes": "75_boots_chelsea"
    },
    "w": {
      "bottom": "49_skirt_long"
    },
    "pal": {
      "outer": "beige",
      "top": "navy",
      "bottom": "denim",
      "shoes": "brown"
    }
  },
  {
    "id": "t8",
    "tag": "date",
    "st": "젠더리스",
    "p": {
      "layer": "10_shirt_open",
      "top": "36_tank",
      "bottom": "04_slacks_wide",
      "shoes": "77_derby"
    },
    "w": null,
    "pal": {
      "layer": "black",
      "top": "white",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "t9",
    "tag": "date",
    "st": "프레피",
    "p": {
      "top": "37_polo",
      "bottom": "63_chino",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "top": "white",
      "bottom": "navy",
      "shoes": "brown"
    }
  },
  {
    "id": "f1",
    "tag": "formal",
    "st": "클래식",
    "p": {
      "outer": "19_blazer",
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "77_derby"
    },
    "w": null,
    "pal": {
      "outer": "navy",
      "top": "white",
      "bottom": "navy",
      "shoes": "black"
    }
  },
  {
    "id": "f2",
    "tag": "formal",
    "st": "댄디",
    "p": {
      "outer": "30_trench",
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "outer": "camel",
      "top": "white",
      "bottom": "charcoal",
      "shoes": "brown"
    }
  },
  {
    "id": "f3",
    "tag": "formal",
    "st": "컨템포러리",
    "p": {
      "outer": "17_coat_long",
      "top": "13_knit_turtle",
      "bottom": "03_slacks_straight",
      "shoes": "75_boots_chelsea"
    },
    "w": null,
    "pal": {
      "outer": "charcoal",
      "top": "black",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "f4",
    "tag": "formal",
    "st": "아이비",
    "p": {
      "outer": "19_blazer",
      "layer": "14_knit_vest",
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "outer": "navy",
      "layer": "gray",
      "top": "white",
      "bottom": "gray",
      "shoes": "brown"
    }
  },
  {
    "id": "f5",
    "tag": "formal",
    "st": "미니멀",
    "p": {
      "outer": "28_coat_short",
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "77_derby"
    },
    "w": {
      "bottom": "49_skirt_long"
    },
    "pal": {
      "outer": "black",
      "top": "white",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "f6",
    "tag": "formal",
    "st": "세미포멀",
    "p": {
      "top": "08_shirt_closed",
      "bottom": "03_slacks_straight",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "top": "white",
      "bottom": "charcoal",
      "shoes": "black"
    }
  },
  {
    "id": "f7",
    "tag": "formal",
    "st": "올드머니",
    "p": {
      "outer": "19_blazer",
      "top": "12_knit_vneck",
      "bottom": "04_slacks_wide",
      "shoes": "74_loafer"
    },
    "w": null,
    "pal": {
      "outer": "camel",
      "top": "cream",
      "bottom": "navy",
      "shoes": "brown"
    }
  },
  {
    "id": "a1",
    "tag": "active",
    "st": "고프코어",
    "p": {
      "outer": "29_puffer",
      "top": "16_hoodie",
      "bottom": "39_cargo",
      "shoes": "73_sneaker_chunky"
    },
    "w": null,
    "pal": {
      "outer": "black",
      "top": "gray",
      "bottom": "khaki",
      "shoes": "white"
    }
  },
  {
    "id": "a2",
    "tag": "active",
    "st": "애슬레저",
    "p": {
      "top": "35_sweat",
      "bottom": "39_cargo",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "navy",
      "bottom": "black",
      "shoes": "white"
    }
  },
  {
    "id": "a3",
    "tag": "active",
    "st": "아메카지",
    "p": {
      "outer": "31_trucker",
      "top": "06_tee_short",
      "bottom": "01_denim_straight",
      "shoes": "76_boots_walker"
    },
    "w": null,
    "pal": {
      "outer": "denim",
      "top": "white",
      "bottom": "khaki",
      "shoes": "brown"
    }
  },
  {
    "id": "a4",
    "tag": "active",
    "st": "스트릿",
    "p": {
      "top": "16_hoodie",
      "bottom": "61_pants_balloon",
      "shoes": "73_sneaker_chunky"
    },
    "w": null,
    "pal": {
      "top": "charcoal",
      "bottom": "black",
      "shoes": "white"
    }
  },
  {
    "id": "a5",
    "tag": "active",
    "st": "프레피",
    "p": {
      "top": "37_polo",
      "bottom": "63_chino",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "white",
      "bottom": "navy",
      "shoes": "white"
    }
  },
  {
    "id": "a6",
    "tag": "active",
    "st": "고프코어",
    "p": {
      "layer": "45_vest_padding",
      "top": "07_tee_long",
      "bottom": "39_cargo",
      "shoes": "76_boots_walker"
    },
    "w": null,
    "pal": {
      "layer": "olive",
      "top": "gray",
      "bottom": "black",
      "shoes": "black"
    }
  },
  {
    "id": "a7",
    "tag": "active",
    "st": "캐주얼",
    "p": {
      "top": "06_tee_short",
      "bottom": "02_denim_wide",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "white",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "h1",
    "tag": "home",
    "st": "캐주얼",
    "p": {
      "top": "35_sweat",
      "bottom": "01_denim_straight",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "ivory",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "h2",
    "tag": "home",
    "st": "스트릿",
    "p": {
      "top": "16_hoodie",
      "bottom": "61_pants_balloon",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "gray",
      "bottom": "charcoal",
      "shoes": "white"
    }
  },
  {
    "id": "h3",
    "tag": "home",
    "st": "놈코어",
    "p": {
      "top": "06_tee_short",
      "bottom": "01_denim_straight",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "top": "white",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "h4",
    "tag": "home",
    "st": "캐주얼",
    "p": {
      "layer": "15_cardigan",
      "top": "06_tee_short",
      "bottom": "63_chino",
      "shoes": "71_sneaker_canvas"
    },
    "w": null,
    "pal": {
      "layer": "beige",
      "top": "white",
      "bottom": "khaki",
      "shoes": "white"
    }
  },
  {
    "id": "h5",
    "tag": "home",
    "st": "시티보이",
    "p": {
      "top": "07_tee_long",
      "bottom": "02_denim_wide",
      "shoes": "73_sneaker_chunky"
    },
    "w": null,
    "pal": {
      "top": "sage",
      "bottom": "denim",
      "shoes": "white"
    }
  },
  {
    "id": "h6",
    "tag": "home",
    "st": "미니멀",
    "p": {
      "top": "09_shirt_short",
      "bottom": "63_chino",
      "shoes": "74_loafer"
    },
    "w": {
      "bottom": "24_skirt_pleat",
      "shoes": "78_flats_ballet"
    },
    "pal": {
      "top": "white",
      "bottom": "beige",
      "shoes": "brown"
    }
  },
  {
    "id": "h7",
    "tag": "home",
    "st": "애슬레저",
    "p": {
      "top": "35_sweat",
      "bottom": "39_cargo",
      "shoes": "73_sneaker_chunky"
    },
    "w": null,
    "pal": {
      "top": "black",
      "bottom": "gray",
      "shoes": "white"
    }
  }
]

/** 판 → 만들기 화면의 상체 아이템 (ITEMS_CATALOG id). 하의·신발은 판 id 를 그대로 들고 간다. */
export const PLATE_TO_ITEM: Record<string, string> = {
  '19_blazer': 'jacket', '31_trucker': 'jacket', '18_jacket_short': 'jacket',
  '30_trench': 'coat', '17_coat_long': 'coat', '28_coat_short': 'coat',
  '29_puffer': 'padding',
  '15_cardigan': 'cardigan', '14_knit_vest': 'vest', '45_vest_padding': 'vest',
  '10_shirt_open': 'shirt', '08_shirt_closed': 'shirt', '09_shirt_short': 'shirt',
  '11_knit_crew': 'knit', '12_knit_vneck': 'knit', '13_knit_turtle': 'knit',
  '35_sweat': 'mtm', '16_hoodie': 'hoodie',
  '37_polo': 'tshirt', '07_tee_long': 'tshirt', '06_tee_short': 'tshirt', '36_tank': 'tshirt',
}
/** 조합의 스타일 이름 → STYLE_GUIDE 키 (색 추천이 읽는다). 없는 것은 null. */
export const STYLE_KEY: Record<string, string | null> = {
  '아이비': 'ivy', '댄디': 'dandy', '미니멀': 'minimal', '올드머니': 'oldmoney', '프레피': 'preppy', '시티보이': 'cityboy',
  '컨템포러리': 'contemporary', '놈코어': 'normcore', '브리티시': 'british', '캐주얼': 'casual', '아메카지': 'amekaji',
  '스트릿': 'street', '고프코어': 'gorpcore', '젠더리스': 'genderless', '애슬레저': 'athleisure', '클래식': 'ivy', '세미포멀': 'dandy',
}

const isKo = () => (i18n.language || 'ko').startsWith('ko')
export const plateName = (id: string): string => { const n = PLATE_NAMES[id]; return n ? (isKo() ? n.ko : n.en) : id }
export const styleName = (st: string): string => { const k = STYLE_KEY[st]; return isKo() || !k ? st : i18n.t('styles:guide.' + k + '.name', { defaultValue: st }).replace(/ (룩|Look)$/, '') }

/* ── 한국어 조사 ── */
const jong = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 ? (c - 0xAC00) % 28 : 0 }
const ro = (w: string) => w + ((jong(w) === 0 || jong(w) === 8) ? '로' : '으로')
const ga = (w: string) => w + (jong(w) ? '이' : '가')

/* ── 계산 ── */
export const partsOf = (c: Template, sex: 'm' | 'w'): Parts => ({ ...c.p, ...((sex === 'w' && c.w) || {}) })
export const sig = (p: Parts) => PARTS.map(k => p[k] || '-').join('|')
export const formality = (p: Parts) => { const ks = PARTS.filter(k => p[k]); let f = ks.reduce((a, k) => a + (F[p[k]!] ?? 3), 0) / Math.max(1, ks.length); if (p.outer && F[p.outer] >= 4) f += .2; return Math.min(5, f) }
const warmth = (p: Parts) => PARTS.filter(k => p[k] && W[p[k]!] !== undefined).reduce((a, k) => a + W[p[k]!], 0)
export const idealW = (t: number): [number, number] => t >= 26 ? [0, 1] : t >= 20 ? [1, 2] : t >= 15 ? [2, 3.2] : [3, 5]
const dist = (x: number, [a, b]: [number, number]) => x < a ? a - x : x > b ? x - b : 0
const situOf = (s: Situ) => SITU.find(x => x.id === s) || SITU[1]

export function scoreOf(c: Template, p: Parts, ctx: Ctx): Score {
  const f = formality(p), w = warmth(p)
  const rng = situOf(ctx.situ).range
  const situ = Math.max(0, 40 - 22 * dist(f, rng)) + (c.tag === ctx.situ ? 3 : 0)
  const weather = Math.max(0, 25 - 14 * dist(w, idealW(ctx.temp)))
  let taste = 10
  for (const k of PARTS) if (p[k] && ctx.prefs.likes[p[k]!]) taste += ctx.prefs.likes[p[k]!]
  if (ctx.prefs.likedStyles[c.st]) taste += ctx.prefs.likedStyles[c.st]
  taste = Math.max(0, Math.min(20, taste))
  let ov = 0
  for (const r of ctx.recent) {
    const rc = TEMPLATES.find(x => x.id === r.id); if (!rc) continue
    const rp = partsOf(rc, ctx.sex)
    for (const k of PARTS) if (p[k] && rp[k] === p[k]) ov++
    if (rc.id === c.id) ov += 2
  }
  const recent = Math.max(0, 10 - 3 * ov)
  const dis = ctx.prefs.dislikes.includes(c.id) ? -30 : 0
  return { situ, weather, taste, recent, dis, total: situ + weather + taste + recent + dis, f, w, ov }
}

const pool = (ctx: Ctx) => TEMPLATES.filter(c => { if (!ctx.anchor) return true; const p = partsOf(c, ctx.sex); return PARTS.some(k => p[k] === ctx.anchor) })
export function ranked(ctx: Ctx): Entry[] {
  return pool(ctx).map(c => { const p = partsOf(c, ctx.sex); return { c, p, s: scoreOf(c, p, ctx) } })
    .sort((a, b) => b.s.total - a.s.total || a.c.id.localeCompare(b.c.id))
}

/** 이유 한 문장: 기여가 큰 두 항목을 잇는다 */
export function reasons(e: Entry, ctx: Ctx): string {
  const sn = i18n.t('outfit.situ.' + ctx.situ)
  const rng = situOf(ctx.situ).range, iw = idealW(ctx.temp), t = ctx.temp
  const ko = isKo()
  const ph: { v: number; mid: string; end: string }[] = []
  const inRange = dist(e.s.f, rng) === 0
  ph.push(inRange
    ? { v: e.s.situ, mid: ko ? `${sn} 자리에 맞고` : `fits ${sn}`, end: ko ? `${sn} 자리에 맞아요` : `it fits ${sn}` }
    : e.s.f > rng[1] ? { v: e.s.situ, mid: ko ? '조금 격식 있는 편이고' : 'a bit dressy', end: ko ? '조금 격식 있는 편이에요' : "it's a bit dressy" }
    : { v: e.s.situ, mid: ko ? '조금 편한 편이고' : 'a bit relaxed', end: ko ? '조금 편한 편이에요' : "it's a bit relaxed" })
  const wOk = dist(e.s.w, iw) <= .3
  if (ko) {
    const mid = wOk ? (e.p.outer ? `${t}°에 아우터가 알맞고` : e.p.layer ? `${t}°에 레이어드로 알맞고` : `${t}°라 아우터 없이도 되고`) : (e.s.w < iw[0] ? `${t}°엔 조금 얇을 수 있고` : `${t}°엔 조금 더울 수 있고`)
    const end = mid.replace(/고$/, '').replace(/알맞$/, '알맞아요').replace(/되$/, '돼요').replace(/있$/, '있어요')
    ph.push({ v: e.s.weather, mid, end })
  } else {
    const mid = wOk ? (e.p.outer ? `the outer suits ${t}°` : e.p.layer ? `the layering suits ${t}°` : `${t}° needs no outer`) : (e.s.w < iw[0] ? `it may run thin at ${t}°` : `it may run warm at ${t}°`)
    ph.push({ v: e.s.weather, mid, end: mid })
  }
  ph.push(e.s.ov === 0
    ? { v: e.s.recent + 2, mid: ko ? '이번 주에 안 입은 조합이고' : 'not worn this week', end: ko ? '이번 주에 안 입은 조합이에요' : "you haven't worn it this week" }
    : { v: e.s.recent, mid: ko ? '최근 입은 옷이 겹치고' : 'overlaps recent wear', end: ko ? '최근 입은 옷이 겹쳐요' : 'it overlaps what you wore recently' })
  const liked = PARTS.find(k => e.p[k] && ctx.prefs.likes[e.p[k]!] > 0)
  if (liked) { const n = plateName(e.p[liked]!); ph.push({ v: e.s.taste + 4, mid: ko ? `좋아요 누른 ${ga(n)} 들어 있고` : `includes the ${n} you liked`, end: ko ? `좋아요 누른 ${ga(n)} 들어 있어요` : `it includes the ${n} you liked` }) }
  ph.sort((a, b) => b.v - a.v)
  return ko ? `${ph[0].mid}, ${ph[1].end}` : `${ph[0].mid[0].toUpperCase()}${ph[0].mid.slice(1)}, and ${ph[1].end}`
}

export const nameOf = (e: Entry): string => e.name || (e.s.situ >= 38 && e.s.weather >= 22 ? i18n.t('outfit.noFail') : i18n.t('outfit.combo', { st: styleName(e.c.st) }))

/** 그 자리에 올 수 있는 옷: 조합표에 등장하는 판 (성별 필터). 겉옷·레이어는 '없음'도 된다. */
export function partOptions(part: Part, sex: 'm' | 'w'): (string | null)[] {
  const s = new Set<string>()
  for (const c of TEMPLATES) { const p = partsOf(c, sex); if (p[part]) s.add(p[part]!) }
  const list = [...s].filter(id => sex === 'w' || !FEMALE_ONLY.has(id))
  return (part === 'outer' || part === 'layer') ? [null, ...list] : list
}

/** 기본에서 옷 한 벌만 바꾼 이웃들 */
export function neighbors(base: Entry, ctx: Ctx): Entry[] {
  const out: Entry[] = []; const p = base.p
  for (const k of PARTS) for (const nid of partOptions(k, ctx.sex)) {
    if ((p[k] || null) === nid) continue
    if (k === 'top' && !nid) continue
    if (!nid && !p[k]) continue
    if (ctx.anchor && p[k] === ctx.anchor) continue
    const np: Parts = { ...p }; if (nid) np[k] = nid; else delete np[k]
    if (np.top && np.top === np.layer) continue
    const c: Template = { id: base.c.id + '~' + k + '=' + (nid || 'none'), tag: base.c.tag, st: base.c.st, p: np, w: null, pal: { ...base.c.pal, ...(nid && !base.c.pal[k] ? { [k]: DEFPAL[k] } : {}) } }
    out.push({ c, p: np, s: scoreOf(base.c, np, ctx), chg: k, from: p[k], to: nid || undefined, gen: true })
  }
  return out
}

export type DirKind = 'formal' | 'relax' | 'warm' | 'cool' | 'twist'
export function direction(base: Entry, kind: DirKind, ctx: Ctx): Entry | null {
  const f0 = base.s.f, w0 = base.s.w
  const nb = neighbors(base, ctx).filter(n => {
    const f = n.s.f, w = n.s.w
    if (kind === 'formal') return f >= f0 + .2 && Math.abs(w - w0) < 1.2
    if (kind === 'relax') return f <= f0 - .2 && Math.abs(w - w0) < 1.2
    if (kind === 'warm') return w >= w0 + .4
    if (kind === 'cool') return w <= w0 - .4
    return Math.abs(f - f0) < .35 && Math.abs(w - w0) < .5 && n.chg !== 'shoes'
  })
  nb.sort((a, b) => b.s.total - a.s.total || a.c.id.localeCompare(b.c.id))
  return nb[0] || null
}

/** 축이 다른 대안 3장 */
export function alternatives(cur: Entry, ctx: Ctx): Entry[] {
  const list = ranked(ctx).filter(e => e.c.id !== cur.c.id && sig(e.p) !== sig(cur.p))
  const key = (e: Entry) => e.p.outer + '|' + e.p.top
  const used = new Set([key(cur)]); const out: Entry[] = []
  const take = (name: string, pick: (e: Entry) => boolean, why: (e: Entry) => string) => {
    const e = list.find(e => !out.includes(e) && !used.has(key(e)) && pick(e))
    if (e) { e.name = name; e.why = why(e); out.push(e); used.add(key(e)) }
  }
  const rng = situOf(ctx.situ).range, mid = (rng[0] + rng[1]) / 2, iw = idealW(ctx.temp), imid = (iw[0] + iw[1]) / 2
  const safe = [...list].sort((a, b) => (Math.abs(a.s.f - mid) + Math.abs(a.s.w - imid)) - (Math.abs(b.s.f - mid) + Math.abs(b.s.w - imid)))[0]
  const ko = isKo()
  take(i18n.t('outfit.alt.safe'), e => e === safe, () => i18n.t('outfit.altWhy.safe'))
  take(i18n.t('outfit.alt.dressy'), e => dist(e.s.f, rng) === 0 && !!(e.p.outer || e.p.layer), e => ctx.prefs.likedStyles[e.c.st] ? i18n.t('outfit.altWhy.likedStyle', { st: styleName(e.c.st) }) : i18n.t('outfit.altWhy.dressy', { st: styleName(e.c.st) }))
  if (ctx.temp < 24) take(i18n.t('outfit.alt.evening'), e => e.s.w >= cur.s.w + .5 && dist(e.s.f, rng) <= .3, e => e.p.outer ? (ko ? `${ro(plateName(e.p.outer))} 한 단계 따뜻해요` : `one step warmer with the ${plateName(e.p.outer)}`) : i18n.t('outfit.altWhy.layerWarm'))
  else take(i18n.t('outfit.alt.noon'), e => e.s.w <= cur.s.w - .4, () => i18n.t('outfit.altWhy.cooler'))
  take(i18n.t('outfit.alt.lastWeek'), e => e.s.ov === 0, () => i18n.t('outfit.altWhy.lastWeek'))
  for (let i = 0; out.length < 3 && i < list.length; i++) take(i18n.t('outfit.alt.rank', { n: out.length + 2 }), e => e === list[i], e => reasons(e, ctx))
  return out.slice(0, 3)
}

/* ── 저장: 👍👎 와 최근 고른 조합 (기기 안에만) ── */
const PREF_KEY = 'sp_outfit_prefs', RECENT_KEY = 'sp_outfit_recent'
export function loadPrefs(): Prefs { try { const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (p && p.likes) return { likes: p.likes || {}, likedStyles: p.likedStyles || {}, dislikes: p.dislikes || [] } } catch {} return { likes: {}, likedStyles: {}, dislikes: [] } }
export function savePrefs(p: Prefs) { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)) } catch {} }
export function loadRecent(): { id: string; ago: number }[] {
  try {
    const arr: { id: string; at: number }[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
    const now = Date.now()
    return arr.filter(r => now - r.at < 7 * 86400e3).slice(0, 5).map(r => ({ id: r.id, ago: Math.round((now - r.at) / 86400e3) }))
  } catch { return [] }
}
export function pushRecent(id: string) {
  try { const arr: { id: string; at: number }[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); arr.unshift({ id, at: Date.now() }); localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 10))) } catch {}
}
export const defaultSitu = (): Situ => { const d = new Date().getDay(); return d === 0 || d === 6 ? 'daily' : 'work' }
