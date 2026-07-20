const { test } = require('node:test');
const assert = require('node:assert');
const { cutoutWhiteBackground } = require('../shared/imageCutout.js');

/** 3x3 の RGBA 画像を作る。rows は [[r,g,b],...] の行列 */
function img3x3(rows) {
  const data = new Uint8ClampedArray(9 * 4);
  rows.flat().forEach((px, i) => {
    data[i * 4] = px[0]; data[i * 4 + 1] = px[1]; data[i * 4 + 2] = px[2]; data[i * 4 + 3] = 255;
  });
  return { data, width: 3, height: 3 };
}
const W = [255, 255, 255];   // 白（背景）
const B = [120, 80, 40];     // 人物（茶）

test('cutoutWhiteBackground: 端に連結した白だけ透明化・人物は不透明のまま', () => {
  const img = img3x3([[W, W, W], [W, B, W], [W, B, W]]);
  cutoutWhiteBackground(img);
  const alpha = (x, y) => img.data[(y * 3 + x) * 4 + 3];
  assert.strictEqual(alpha(0, 0), 0, '角の白が透明になっていない');
  assert.strictEqual(alpha(1, 1), 255, '人物が消えた');
  assert.strictEqual(alpha(1, 2), 255, '下辺の人物が消えた');
  // 人物の直上は白フチ（ステッカー縁取り）として白・不透明で残る
  assert.deepStrictEqual([...img.data.subarray((0 * 3 + 1) * 4, (0 * 3 + 1) * 4 + 4)],
    [255, 255, 255, 255], '人物隣接の白フチがない');
});

test('cutoutWhiteBackground: 人物内部の白（歯・白い服）は消えない', () => {
  // 白が茶に囲まれ、端と連結していない
  const img = img3x3([[B, B, B], [B, W, B], [B, B, B]]);
  cutoutWhiteBackground(img);
  assert.strictEqual(img.data[(1 * 3 + 1) * 4 + 3], 255, '内部の白が消えた');
});

test('cutoutWhiteBackground: ほぼ白（にじみ 240,240,238）も背景として透明化', () => {
  const N = [240, 240, 238];
  const img = img3x3([[N, N, N], [N, B, N], [N, B, N]]);
  cutoutWhiteBackground(img);
  assert.strictEqual(img.data[3], 0, 'ほぼ白が透明になっていない');
  assert.strictEqual(img.data[(1 * 3 + 1) * 4 + 3], 255);
});

test('cutoutWhiteBackground: 白より暗い背景（200,200,200）は消さない', () => {
  const G = [200, 200, 200];
  const img = img3x3([[G, G, G], [G, B, G], [G, G, G]]);
  cutoutWhiteBackground(img);
  assert.strictEqual(img.data[3], 255, 'しきい値未満の色が消えた');
});

test('cutoutWhiteBackground: 人物の周囲にステッカー風の白フチが付く', () => {
  // 5x5: 中央1ピクセルが人物、まわりは白背景（全部端連結で消える）
  const data = new Uint8ClampedArray(25 * 4);
  for (let i = 0; i < 25; i++) { data[i * 4] = 255; data[i * 4 + 1] = 255; data[i * 4 + 2] = 255; data[i * 4 + 3] = 255; }
  const c = (2 * 5 + 2) * 4; data[c] = 120; data[c + 1] = 80; data[c + 2] = 40;
  const img = { data, width: 5, height: 5 };
  cutoutWhiteBackground(img);
  const px = (x, y) => data.subarray((y * 5 + x) * 4, (y * 5 + x) * 4 + 4);
  assert.deepStrictEqual([...px(2, 2)], [120, 80, 40, 255], '人物が変わった');
  // 隣接ピクセル（フチ幅1以上）は白・不透明のフチになる
  assert.deepStrictEqual([...px(1, 2)], [255, 255, 255, 255], '左隣に白フチがない');
  assert.deepStrictEqual([...px(2, 1)], [255, 255, 255, 255], '上隣に白フチがない');
  // 角（0,0）はフチ半径の外なので透明のまま
  assert.strictEqual(px(0, 0)[3], 0, '遠くの背景までフチ化した');
});

test('cutoutWhiteBackground: 全面が人物（消える背景なし）ならフチも増えない', () => {
  const data = new Uint8ClampedArray(9 * 4);
  for (let i = 0; i < 9; i++) { data[i * 4] = 120; data[i * 4 + 1] = 80; data[i * 4 + 2] = 40; data[i * 4 + 3] = 255; }
  const img = { data, width: 3, height: 3 };
  cutoutWhiteBackground(img);
  for (let i = 0; i < 9; i++) assert.strictEqual(data[i * 4 + 3], 255);
  assert.strictEqual(data[0], 120, '色が変わった');
});
