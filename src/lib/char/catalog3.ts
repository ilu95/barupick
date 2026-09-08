// @ts-nocheck
// 원본: 바루사 자사몰/app/js/catalog3.js (컬러랩 3판). 표는 손으로 관리하지 않는다 — public/char/*.json 을 읽는다.
import { v } from './version';
/* 무엇이 있는지. **표를 손으로 관리하지 않는다** — `charstudio/catalog3.py` 가
   `spec3.py` 와 `dress.py` 에서 만들어 둔 JSON 을 읽는다. 2판에서 이 표를
   손으로 들고 있다가 `mid2` 네 벌이 빠져 소매가 안 뽑힌 적이 있다.

   이름도 여기 두지 않는다 — `i18n/*.json` 이 갖는다. */

// boot() 이 채운다. app.js 는 R.boot() 뒤에만 읽으므로 비어 있는 순간을 안 본다.
export const SLOT = {};
export const Z = {};
export const SLOT_NAME = {};
export const FEMALE_ONLY = new Set();
export const MALE_ONLY = new Set();
export const HEAD = {};                 // 머리 부속 표 (head3.json 의 parts)
const SET = { m: [], w: [] };
const PAIR = new Set();                 // 있는 (헤어__모자) 조합
const TIEPAIR = new Set();              // 있는 (넥타이__상의) 조합
const SKIN = new Set();                 // 맨발 판(_sk)이 있는 신발
const BCUT = new Set();                 // 긴 아우터 안으로 밀어 넣은 하의
const HOLE = new Set();
const BOXN = new Set();                 // 그중 목·어깨 자까지 있는 것
const BACK = new Set();                 // 안감 판(_back)이 있는 겉옷
const HOODED = new Set();               // 후드 달린 옷 (_p2 판이 따로 있다)

export const A3 = '/char/';   // public/char/ — 바루픽 정적 경로
/* 판은 WebP 로 나간다 (`charstudio/webp.py`). PNG 도 같은 이름으로 남아 있지만
   그건 빌드 스크립트가 읽는 원본이고, 브라우저가 받는 것은 이쪽이다 —
   54MB 가 15MB 가 된다. 칠한 뒤의 차이는 평균 1 미만이라 눈에 안 보인다. */
export const EXT = '.webp';

export async function boot() {
  const [cat, head, man] = await Promise.all([
    fetch(v(A3 + 'catalog3.json')).then((r) => r.json()),
    fetch(v(A3 + 'head/head3.json')).then((r) => r.json()),
    fetch(v(A3 + 'manifest.json')).then((r) => r.json()).catch(() => null),
  ]);
  Object.assign(Z, cat.z, head.z);
  Object.assign(SLOT_NAME, cat.slotName);
  for (const sex of ['m', 'w']) {
    SET[sex] = cat.sets[sex] || [];
    for (const it of SET[sex]) {
      SLOT[it.id] = it.slot;
      if (it.hood) HOODED.add(it.id);
    }
  }
  const mIds = new Set(SET.m.map((i) => i.id));
  const wIds = new Set(SET.w.map((i) => i.id));
  for (const id of wIds) if (!mIds.has(id)) FEMALE_ONLY.add(id);
  for (const id of mIds) if (!wIds.has(id)) MALE_ONLY.add(id);
  for (const [name, p] of Object.entries(head.parts)) {
    HEAD[name] = p;
    SLOT[name] = p.slot;
    if (p.sex === 'm') MALE_ONLY.add(name);
    if (p.sex === 'w') FEMALE_ONLY.add(name);
  }
  if (man) {
    (man.pair || []).forEach((n) => PAIR.add(n));
    (man.tie || []).forEach((n) => TIEPAIR.add(n));
    (man.skin || []).forEach((n) => SKIN.add(n));
    (man.boxn || []).forEach((n) => BOXN.add(n));
    (man.hole || []).forEach((n) => HOLE.add(n));
    (man.bcut || []).forEach((n) => BCUT.add(n));
    (man.back || []).forEach((n) => BACK.add(n));
  }
}

/* 조합판이 있는지. **없으면 기본 판으로 떨어진다** — 모자별 머리, 셔츠별
   넥타이는 조합마다 따로 그려 두었지만 다 채우지 못한 조합도 있다. */
export const hasPair = (hair, hat) => PAIR.has(hair + '__' + hat);
export const hasTiePair = (tie, mid1) => TIEPAIR.has(tie + '__' + mid1);

/* 신발이 벗겨 놓은 맨발. 발레플랫·슬라이드는 발등이 드러나는데 베이스에는
   그 자리에 흰 운동화가 있었을 뿐 맨발이 없다. 있는 것만 한 장 더 얹는다. */
export const hasSkin = (sex, id) => SKIN.has(sex + '/' + id);

/* **덮개 자.** 판끼리 포개지지 않아서, 어떤 안쪽 옷은 겉옷보다 넓게 그려져
   있다 (여성 니트베스트 어깨 264 vs 아우터 234~254). 그대로 두면 겉옷을
   입어도 어깨·목·옆구리가 밖으로 삐져나온다. `boxruler.py` 가 겉옷마다
   '허락하는 자리'를 구워 뒀다.
     _boxn  목·어깨용 — 소매 있는 겉옷만. 조끼는 진동이 열려 있어
            안쪽 어깨가 보이는 게 맞으므로 없다.
   **하의는 자르지 않는다.** 잘랐더니 밑단에 단차가 생기고 허리 길이 겉옷
   아래에서 바지가 깎여 허벅지가 드러났다. 긴 아우터를 와이드 팬츠 위에
   다시 뽑는 쪽으로 풀었다 (`boxruler.py` 설명). */
/* **안감 판.** 열어 입는 코트는 트임 아래를 자기 안감이 메우고 있었다.
   그걸 떼어 하의보다 **뒤**(z 2)에 깐다 — 실제로도 열린 코트의 트임으로는
   다리 사이에 안감이 보인다. 하의가 가리는 만큼만 저절로 가려진다. */
export const hasBack = (sex, id) => BACK.has(sex + '/' + id);

export const hasBoxTop = (sex, id) => BOXN.has(sex + '/' + id);

/* **겉옷 테두리 안의 구멍.** 생성본에서 손이 옷 위로 나와 있으면 옷 판에
   손 모양 구멍이 남는다. 거기 보여야 하는 것은 **몸(손)** 이지 아래 옷이
   아닌데, 앱은 하의를 몸보다 나중에 그리니 통 넓은 바지가 그 구멍으로
   손을 덮고 나온다. 하의에서 이 자리를 지우면 밑의 손이 드러난다.
   앞 트임은 이 자에서 빠져 있다 (`boxruler.hole_box`). */
export const hasHole = (sex, id) => HOLE.has(sex + '/' + id);

/* **긴 아우터 안으로 밀어 넣은 하의.** 아우터는 하의 없는 레퍼런스 위에
   그려서 밑단이 몸통 폭에 맞춰 재단돼 있다. 통 넓은 하의를 입으면 한쪽
   3~22px 씩 아우터 옆으로 나오는데, 실제로는 코트 안에 있어야 하는 옷이다.
   조합마다 모서리를 깎은 판을 미리 구워 두었다 (`bottomcut.py`) — 팔 뽑기와
   같은 방식이라 렌더러는 판만 고른다. */
export const hasBCut = (bottom, outer, sex) =>
  BCUT.has(sex + '/' + bottom + '__' + outer);

/* 후드가 달린 옷. 후드는 판이 따로 떨어져 있어(`_p2`) 아우터 위로 올린다.
   어느 옷에 후드가 있는지는 카탈로그가 알고 있다. */
export const hoodOf = (id) => (HOODED.has(id) ? id + '_p2' : null);

export const items = (slot, sex) =>
  [...SET[sex === 'w' ? 'w' : 'm'].filter((i) => i.slot === slot).map((i) => i.id),
    ...Object.keys(HEAD).filter((n) => HEAD[n].slot === slot
      && (!HEAD[n].sex || HEAD[n].sex === sex))];

/* 같은 id 라도 성별에 따라 잰 값이 다르다 (밑단 폭 · 판 윗선). 성별을 주면
   그쪽 표를 먼저 본다 — 안 주면 남성 표가 먼저라 여성 값이 가려진다. */
export const info = (id, sex) => {
  const a = sex === 'w' ? SET.w : SET.m;
  const b = sex === 'w' ? SET.m : SET.w;
  return a.find((i) => i.id === id) || b.find((i) => i.id === id) || null;
};

/* 원피스 칸의 옷이 **어느 칸을 가져가는지.** 원피스는 혼자 입는 옷이라
   하의·상의·이너를 다 가져가지만, 오버올은 사실상 민소매다 — 가슴판이 작고
   옆이 깊게 파여 안에 입은 옷이 몸통 양쪽으로 다 보인다. 하의만 다툰다. */
export const covers = (id) => (info(id) || {}).covers || [];

// 옷을 고르는 칸. 순서가 곧 화면 순서다.
export const WEAR_SLOTS = ['dress', 'bottom', 'inner', 'mid1', 'tie', 'mid2',
  'outer', 'scarf', 'sock', 'shoe'];

/* 표정 칸은 뺐다. 표정은 어떤 배색 판정도 바꾸지 않고, 놀란 눈이나 활짝 웃는
   입은 시선을 얼굴로 끌어 색 블록에서 떼어 놓는다 — 색을 보는 도구에서
   얼굴이 색과 경쟁하면 안 된다. 판과 렌더러 지원은 그대로 두었으므로
   'face' 를 이 배열에 도로 넣으면 칸이 되살아난다. */
export const BODY_SLOTS = ['hair', 'glasses', 'hat'];

// 넥타이는 칼라 있는 셔츠 위에만 올라간다 — 매듭이 칼라 안에 얹혀 있다.
export const TIE_NEEDS = new Set(['08_shirt_closed', '09_shirt_short']);

/* 색표는 2판 것을 그대로 쓴다 — 룩북에서 뽑은 실제 옷 색이고 배색 판정이
   읽는 축(계열·명도·목소리)이 여기 붙어 있다. 옷이 바뀌었다고 색이 바뀌지는
   않는다. app.js 가 한 곳에서만 가져가도록 여기서 다시 내보낸다. */
// 색표는 바루픽 것을 쓴다 (lib/colors.ts). render() 는 '#RRGGBB' 만 받으므로 여기서 색을 내보내지 않는다.

/* 성별을 바꿔도 민머리가 되지 않게, 반대편의 비슷한 자리로 갈아 끼운다.
   **긴 여성 헤어 넷(레이어드·긴 생머리·반묶음·웨이브펌)은 목록에서 내렸다**
   — 모자마다 생김새가 달라지고 머리가 옷을 가렸다 (`headspec.HIDE`).
   그쪽을 가리키던 자리는 남은 넷으로 돌린다. */
export const HAIR_SWAP = {
  h1_twoblock: 'hf5_bob', h2_leaf: 'hf2_hush', h3_slick: 'hf1_tassel',
  h4_wave: 'hf2_hush', h5_dandy: 'hf1_tassel', h6_shadow: 'hf2_hush',
  h7_buzz: 'hf5_bob', h8_middle: 'hf1_tassel',
  hf1_tassel: 'h3_slick', hf2_hush: 'h2_leaf',
  hf4_pony: 'h1_twoblock', hf5_bob: 'h1_twoblock',
};
