// @ts-nocheck
// 원본: 바루사 자사몰/app/js/render3.js (컬러랩 3판). 규칙: 겹침은 판에서 풀고 렌더러는 판을 고를 뿐이다.
import { v } from './version';
/* 캐릭터 렌더러 (3판).

   2판 렌더러는 겉옷의 테두리로 안쪽 옷을 실시간으로 가두느라 마스크를 만들고
   덩어리를 세는 코드가 300줄이었다. 3판은 그 판단을 **에셋으로 옮겼다** —
   팔 뽑은 판(`_cut`), 목 자른 판(`_h`), 모자별 머리(`pair/`)를 미리 그려 두고
   여기서는 고를 뿐이다. 그래서 이 파일이 하는 일은 넷뿐이다.

     ① 어느 변형을 쓸지 고른다 (`_cut` · `_h` · 조합판)
     ② 하의를 입으면 베이스의 속옷 자리를 지운다
     ③ 명도비로 색을 칠한다
     ④ z 순서대로 겹친다

   색칠은 2판 것을 그대로 가져왔다. 곱셈만 하면 밝은 쪽이 흰색으로 밀려
   채도를 잃으므로, 밝은 쪽은 '같은 색의 밝은 버전'으로 램프를 태운다.
   달라진 건 기준 밝기뿐이다 — 2판은 천 색이 하나(158)였지만 3판은 판마다
   다르다. 옷과 새 머리 부속은 시안(120), 떼어낸 부속(후드·넥타이·조합판
   모자)은 바이올렛(95), 2판에서 넘어온 모자는 회색(152)이다. */
import * as C from './catalog3';

export const W = 896;
export const H = 1200;

const CY = [0, 166, 196];          // 옷·머리의 키 컬러
const VI = [122, 60, 200];         // 떼어낸 부속 (후드·넥타이·조합판 모자)
const GREY = [158, 158, 158];      // 2판에서 넘어온 판의 기준색

const cache = new Map();           // 원본 그림
/* 칠한 결과. 한 벌을 칠하는 데 896x1200 을 두 번 훑으므로, 색 하나 바꿀 때
   나머지 열 벌을 다시 칠하지 않도록 들고 있는다. 다만 캔버스 한 장이 4MB 라
   무한정 쌓으면 안 된다 — 한 코디에 필요한 장수(옷 9 + 머리 4)의 두 배만
   남기고 오래된 것부터 버린다. */
const tinted = new Map();
const TINT_MAX = 26;

export async function boot() { await C.boot(); }

function load(path) {
  if (cache.has(path)) return cache.get(path);
  const p = new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);          // 없는 조합은 기본 판으로 떨어진다
    im.src = v(C.A3 + path + C.EXT);
  });
  cache.set(path, p);
  return p;
}

/** 후보를 앞에서부터 받아 본다. 조합판이 없으면 기본 판이 나온다. */
async function first(paths) {
  for (const p of paths) {
    const im = await load(p);
    if (im) return { im, path: p };
  }
  return null;
}

/* ───────────────────────────── 색칠 ───────────────────────────── */

const hex2rgb = (s) => [1, 3, 5].map((i) => parseInt(s.substr(i, 2), 16));
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/* 하이라이트를 '흰색'이 아니라 '같은 색의 밝은 버전'으로 잡는다. */
function highlightOf([r, g, b]) {
  const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255;
  const l = (mx + mn) / 2, d = mx - mn;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const l2 = l + (1 - l) * 0.42, s2 = s * 0.88;
  let h = 0;
  if (d !== 0) {
    const R = r / 255, G = g / 255, B = b / 255;
    h = mx === R ? ((G - B) / d) % 6 : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const c = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return t.map((q) => (q + m) * 255);
}

/* 판 하나를 명도비로 다시 칠해 새 캔버스로 돌려준다.

   `ref` 는 그 판이 **무슨 색으로 그려졌는지**다. 그 밝기가 곧 '평평한 천'의
   기준점이고, 판마다 자기 그림에서 기준을 다시 잡으면 같은 색을 칠해도 옷마다
   다르게 나온다 (2판 실측: 원본 3 차이가 결과 17 차이). 그래서 기준점은
   고정하고, 램프의 위쪽 끝만 그림에서 읽는다. */
function tint(im, path, hexColor, ref) {
  const key = path + '|' + (hexColor || '');
  if (tinted.has(key)) return tinted.get(key);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, W, H);
  if (!hexColor) { keep(key, c); return c; }

  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const base = hex2rgb(hexColor);
  const high = highlightOf(base);
  const mid = lum(ref[0], ref[1], ref[2]);

  const hist = new Uint32Array(256); let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] <= 40) continue;
    hist[lum(d[i], d[i + 1], d[i + 2]) | 0]++; n++;
  }
  if (!n) { keep(key, c); return c; }
  let acc = 0, hi = 255;
  for (let q = 0; q < 256; q++) { acc += hist[q]; if (acc <= n * 0.995) hi = q; }
  hi = Math.max(hi, mid + 1);

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] <= 40) continue;
    const L = lum(d[i], d[i + 1], d[i + 2]);
    if (L <= mid) {
      const k = L / mid;                       // 어두운 쪽은 곱셈 — 먹선이 산다
      d[i] = base[0] * k; d[i + 1] = base[1] * k; d[i + 2] = base[2] * k;
    } else {
      const u = Math.min(1, (L - mid) / (hi - mid));
      d[i] = base[0] + (high[0] - base[0]) * u;
      d[i + 1] = base[1] + (high[1] - base[1]) * u;
      d[i + 2] = base[2] + (high[2] - base[2]) * u;
    }
  }
  ctx.putImageData(img, 0, 0);
  keep(key, c);
  return c;
}

function keep(key, c) {
  tinted.set(key, c);
  while (tinted.size > TINT_MAX) tinted.delete(tinted.keys().next().value);
}

/** src 를 mask 안쪽만 남긴다 (도려내기의 반대). */
function clip(src, mask) {
  const t = document.createElement('canvas');
  t.width = W; t.height = H;
  const tx = t.getContext('2d');
  tx.drawImage(src, 0, 0, W, H);
  tx.globalCompositeOperation = 'destination-in';
  tx.drawImage(mask, 0, 0, W, H);
  return t;
}

/** src 에서 mask 자리를 도려낸다. 마스크 판은 알파로 저장돼 있다. */
function erase(src, mask) {
  const t = document.createElement('canvas');
  t.width = W; t.height = H;
  const tx = t.getContext('2d');
  tx.drawImage(src, 0, 0, W, H);
  tx.globalCompositeOperation = 'destination-out';
  tx.drawImage(mask, 0, 0, W, H);
  return t;
}

/* ───────────────────────────── 그리기 ───────────────────────────── */

/** items = [{id, color}] · body = {sex, hair, hairColor, face, glasses, hat, ...} */
export async function render(target, items, body) {
  const sex = body.sex === 'w' ? 'w' : 'm';
  const dir = sex + '/';
  const HEAD = C.HEAD;
  const Z = C.Z;
  const info = (id) => C.info(id, sex) || {};

  const worn = (items || [])
    .filter((x) => x && x.id && C.SLOT[x.id])
    .sort((a, b) => Z[C.SLOT[a.id]] - Z[C.SLOT[b.id]]);

  /* ① 어느 변형을 쓸지 — 팔 뽑기와 목 자르기.
     맨 위에 오는 **소매 있는 옷** 아래의 옷은 팔을 뽑는다. 후드티 위의 옷은
     목을 자른다 — 후드 위에 덧대는 게 아니라 겉옷 쪽을 미리 잘라 두었다
     (`hoodruler`). 두 판단 다 파일 이름 고르기로 끝난다. */
  const sleeved = worn.filter((x) => info(x.id).sleeve === 'long');
  const top = sleeved.length ? sleeved[sleeved.length - 1] : null;
  const hoodWear = worn.find((x) => C.hoodOf(x.id)) || null;
  const mid1 = (worn.find((x) => C.SLOT[x.id] === 'mid1') || {}).id;
  /* **통이 좁은 바지에는 부츠가 위로 올라온다.** 기본은 신발이 바지 아래다 —
     밑단이 신발 위에 쌓이는 게 실제 모습이니까. 그런데 좁은 바지가 부츠 목을
     덮으면 부츠가 부츠로 안 보인다 (슬림이 워커의 32%, 레깅스가 어그의 16%,
     롱부츠의 46% 를 덮는다). 실제로도 이런 바지는 부츠 안에 넣어 신는다.
     무릎까지 오는 롱부츠는 어느 바지 위로도 올라온다 — 아니면 무릎에서 잘려
     앵클부츠가 되고, 고른 옷이 화면에서 사라진다. 자는 `catalog3.py` 가 쟀다. */
  const narrow = worn.some((x) => C.SLOT[x.id] === 'bottom' && info(x.id).narrow);
  const zOf = (x) => {
    const slot = C.SLOT[x.id];
    const it = info(x.id);
    if (slot === 'shoe') {
      const b = it.boot || 0;
      if (b === 2 || (b === 1 && narrow)) return Z.bottom + 0.1;
    }
    return it.z || Z[slot];
  };

  /* **덮개.** 착장에서 제일 바깥의 겉상의·아우터. 그 안쪽 옷이 덮개 밖으로
     삐져나오지 않게 자른다 — 판끼리 포개지지 않아서 생기는 일이다.
     자는 `boxruler.py` 가 구웠고, 자르는 곳은 **목·어깨뿐**이다 — 그것도
     덮개에 **소매가 있을 때만**. 조끼는 진동이 열려 있어 안쪽 어깨가
     보이는 게 맞다. 하의는 자르지 않는다 (`boxruler.py` 설명). */
  const cover = worn.filter((x) => ['mid2', 'outer'].includes(C.SLOT[x.id])).pop() || null;
  const boxOf = (x) => {
    if (!cover || x === cover || Z[C.SLOT[x.id]] >= Z[C.SLOT[cover.id]]) return null;
    const slot = C.SLOT[x.id];
    if (['bottom', 'dress', 'shoe', 'sock'].includes(slot)) return null;
    return C.hasBoxTop(sex, cover.id) ? dir + cover.id + '_boxn' : null;
  };

  const layers = [];
  const add = (alt, color, z, ref, box, hand) =>
    layers.push({ alt: Array.isArray(alt) ? alt : [alt], color, z, ref: ref || CY, box, hand });

  for (const x of worn) {
    const slot = C.SLOT[x.id];
    const cut = !!(top && x !== top && info(x.id).sleeve !== 'none'
      && Z[slot] < Z[C.SLOT[top.id]]);
    const neck = !!(hoodWear && x !== hoodWear && slot !== 'scarf'
      && Z[slot] > Z[C.SLOT[hoodWear.id]]);
    const suf = (cut ? '_cut' : '') + (neck ? '_h' : '');
    /* 열린 코트의 안감은 **하의보다 뒤**에 깐다. 다리 사이로만 보인다. */
    if (C.hasBack(sex, x.id)) {
      add(dir + x.id + '_back', x.color, Z.coat_back || 2);
    }
    /* 신발이 벗겨 놓은 맨발을 먼저 깐다. 칠하지 않는다 — 살갗이다. */
    if (slot === 'shoe' && C.hasSkin(sex, x.id)) {
      add(dir + x.id + '_sk', null, zOf(x) - 0.01);
    }
    // 넥타이는 **어느 셔츠 위인지**에 따라 매듭 자리가 다르다. 반팔 셔츠는
    // 칼라가 열려 누우므로 매듭이 목젖 아래 V 안으로 내려앉는다.
    let pair = slot === 'tie' && mid1 && C.hasTiePair(x.id, mid1)
      ? x.id + '__' + mid1 : null;
    /* **긴 아우터 안으로 밀어 넣은 하의.** 모서리를 깎아 둔 판이 있으면
       그걸 쓴다 — 넥타이 조합판과 같은 자리, 같은 방식이다. */
    if (['bottom', 'dress'].includes(slot) && cover
        && C.hasBCut(x.id, cover.id, sex)) {
      pair = x.id + '__' + cover.id;
    }
    const alt = [];
    if (pair) alt.push(dir + pair + suf, dir + pair);
    alt.push(dir + x.id + suf);
    if (suf) alt.push(dir + x.id);
    add(alt, x.color, zOf(x), null, boxOf(x),
      x !== cover && ['bottom', 'dress'].includes(slot));
  }
  // 후드는 겉옷 위로 나온다 — 판이 따로 떨어져 있다
  if (hoodWear) add(dir + C.hoodOf(hoodWear.id), hoodWear.color, Z.hood || 8.5, VI);

  /* ② 머리 부속. **모자 쓴 머리는 조합마다 따로 그려 뒀다** — 모자가 머리를
     누르는 모양은 머리마다 다르다. 없는 조합은 예전 방식(모자 + 가릴 자리)
     으로 떨어진다. */
  const hair = body.hair && HEAD[body.hair] ? body.hair : null;
  const hat = body.hat && HEAD[body.hat] ? body.hat : null;
  const paired = !!(hair && hat && C.hasPair(hair, hat));
  const pn = paired ? 'head/pair/' + hair + '__' + hat : null;
  const refOf = (name) => HEAD[name].tint || GREY;

  if (body.face && HEAD[body.face]) add('head/' + body.face, null, Z.face);
  if (hair) {
    add(paired ? pn + '_hair' : 'head/' + hair, body.hairColor, Z.hair,
      paired ? CY : refOf(hair));
  }
  if (body.glasses && HEAD[body.glasses]) {
    add('head/' + body.glasses, body.glassesColor || '#3A3F45', Z.glasses,
      refOf(body.glasses));
  }
  if (hat) {
    add(paired ? pn + '_hat' : 'head/' + hat, body.hatColor || '#3A3F45', Z.hat,
      paired ? VI : refOf(hat));
  }

  layers.sort((a, b) => a.z - b.z);

  /* ③ 그림을 다 받아 둔 뒤에 한 번에 그린다. 중간에 await 이 끼면 먼저 시작한
     렌더가 뒤에 시작한 렌더 위에 덮이는 일이 생긴다. */
  const base = await load(dir + 'base_body');
  const needUnder = worn.some((x) => ['bottom', 'dress'].includes(C.SLOT[x.id]));
  const under = needUnder ? await load(dir + 'base_under_mask') : null;
  /* **신발은 베이스가 신고 있는 흰 슬립온을 갈아 끼운다.** 옷은 맨살 위에
     얹히지만 신발은 자리를 빼앗으므로, 신기 전에 그 슬립온을 지운다.
     안 지우면 발레플랫처럼 작은 신발 뒤로 흰 운동화가 삐져나온다. */
  const shoe = worn.some((x) => C.SLOT[x.id] === 'shoe')
    ? await load(dir + 'base_shoe_mask') : null;
  const hatCover = hair && hat && !paired && HEAD[hat].cover
    ? await load('head/' + hat + '_cover') : null;
  /* **겉옷 테두리 안의 구멍으로는 아래 옷이 새면 안 된다.** 생성본에서 손이
     옷 위로 나와 있으면 옷 판에 손 모양 구멍이 남는데, 거기 보여야 하는 것은
     몸(손)이지 하의가 아니다. 앱은 하의를 몸보다 **나중에** 그리므로 통 넓은
     바지·치마가 그 구멍으로 손을 덮고 나온다 — 손 옆에 바지 색 쐐기가 섰다
     (대표님 지적 2026-09-06). 하의에서 그 자리를 지우면 밑의 손이 드러난다.
     앞 트임은 이 자에 없다. */
  const hole = cover && C.hasHole(sex, cover.id)
    && worn.some((x) => ['bottom', 'dress'].includes(C.SLOT[x.id]))
    ? await load(dir + cover.id + '_hole') : null;
  const got = await Promise.all(layers.map((l) => first(l.alt)));
  const boxes = await Promise.all(layers.map((l) => (l.box ? load(l.box) : null)));

  const g = target.getContext('2d');
  target.width = W; target.height = H;
  g.clearRect(0, 0, W, H);

  /* **몸보다 뒤에 깔리는 판**이 있다. 열린 코트의 안감이 그렇다 — 코트 뒤판이라
     몸 뒤에 있어야 다리를 덮지 않고 다리 사이로만 보인다. z 2 이하가 그것이다. */
  const draw1 = (l, i) => {
    const r = got[i];
    if (!r) return;
    let c = tint(r.im, r.path, l.color, l.ref);
    if (boxes[i]) c = clip(c, boxes[i]);          // 덮개 밖으로 나온 곳을 자른다
    if (l.hand && hole) c = erase(c, hole);       // 겉옷 구멍 자리를 비운다
    // 조합판이 없는 모자는 예전 방식 — 모자가 앉는 자리의 머리를 지운다
    if (hatCover && l.z === Z.hair) c = erase(c, hatCover);
    g.drawImage(c, 0, 0);
  };
  layers.forEach((l, i) => { if (l.z <= 2) draw1(l, i); });

  // 베이스 — 하의나 원피스를 입으면 속옷 자리를, 신발을 신으면 슬립온 자리를 지운다
  if (base) {
    let b = base;
    if (under) b = erase(b, under);
    if (shoe) b = erase(b, shoe);
    g.drawImage(b, 0, 0, W, H);
  }

  layers.forEach((l, i) => { if (l.z > 2) draw1(l, i); });
}
