const { test } = require('node:test');
const assert = require('node:assert');
const t = require('../shared/popTemplates.js');

const productContent = {
  type: 'product', variant: 'v1', catchAngle: '驚き',
  catch: '世界初！水に溶くだけで本わさびに！',
  fields: {
    商品名: 'わさびパウダー', 補足: '山葵粉末', 価格: 756, 容量: '10g',
    生産者: 'ふれあい広場', アピールポイント: [],
  },
};

test('renderPop(product): 価格・商品名・容量が入力値のまま出力される【生命線】', () => {
  const html = t.renderPop(productContent);
  assert.ok(html.includes('756'), '価格がそのまま出ていない');
  assert.ok(html.includes('わさびパウダー'));
  assert.ok(html.includes('10g'));
  assert.ok(html.includes('ふれあい広場'));
});

test('renderPop(product): variant がルートクラスに反映', () => {
  assert.ok(t.renderPop(productContent).includes('class="pop shelf v1"'));
  assert.ok(t.renderPop({ ...productContent, variant: 'v2' }).includes('shelf v2'));
});

test('renderPop(product): 価格 null は空表示（0 や undefined を出さない）', () => {
  const html = t.renderPop({ ...productContent, fields: { ...productContent.fields, 価格: null } });
  assert.ok(!html.includes('null') && !html.includes('undefined'));
});

test('escapeHtml: XSS 文字列を無害化', () => {
  const html = t.renderPop({
    ...productContent,
    fields: { ...productContent.fields, 商品名: '<script>alert(1)</script>' },
  });
  assert.ok(!html.includes('<script>alert'));
  assert.ok(html.includes('&lt;script&gt;'));
});

const explainContent = {
  type: 'explain', variant: 'e1', catchAngle: '問いかけ',
  catch: '全粒粉ってどうして身体にいいの？',
  fields: {
    フック: 'パンにも、お菓子にも。', 主題: '小麦 全粒粉', 説明文: '外皮も胚芽もまるごと。',
    箇条書き: ['食物繊維たっぷり', '鉄分は3倍'],
    比較データ: [{ ラベル: 'ビタミンE', 対象値: 4, 比較値: 1, 単位: '倍', 補足: '' }],
  },
};

test('renderPop(explain): 比較データが棒グラフ HTML になり数値が正確', () => {
  const html = t.renderPop(explainContent);
  assert.ok(html.includes('class="pop a4 e1"'));
  assert.ok(html.includes('4倍'), '倍率表示がない');
  assert.ok(html.includes('height:96%') || html.includes('height: 96%'), '対象バーの高さが計算されていない');
});

test('renderPop(explain): 比較値 0 の項目は0除算を防ぎ Infinity/NaN を出さない', () => {
  const html = t.renderPop({
    ...explainContent,
    fields: {
      ...explainContent.fields,
      比較データ: [{ ラベル: '糖質', 対象値: 5, 比較値: 0, 単位: 'g', 補足: '' }],
    },
  });
  assert.ok(!html.includes('Infinity'), 'Infinity が出力されている');
  assert.ok(!html.includes('NaN'), 'NaN が出力されている');
  assert.ok(!html.includes('class="charts"'), '比較値0の項目はグラフに出ないはず');
});

test('renderPop(explain): 対象値0・比較値正（0倍）でも Infinity/NaN を出さず比較バーの高さが有効な数値%になる', () => {
  const html = t.renderPop({
    ...explainContent,
    fields: {
      ...explainContent.fields,
      比較データ: [{ ラベル: 'カフェイン', 対象値: 0, 比較値: 100, 単位: '倍', 補足: '' }],
    },
  });
  assert.ok(!html.includes('Infinity'), 'Infinity が出力されている');
  assert.ok(!html.includes('NaN'), 'NaN が出力されている');
  assert.ok(html.includes('class="charts"'), '対象値0でもグラフ自体は出るはず');
  const m = html.match(/bar w" style="height:([\d.]+)%"/);
  assert.ok(m, '比較バーの height が数値%で出力されていない');
  const h = Number(m[1]);
  assert.ok(Number.isFinite(h) && h > 0 && h <= 96, `比較バー高さが不正: ${m[1]}`);
});

test('renderPop(explain): 比較データ 0 件ならグラフブロックを出さない', () => {
  const html = t.renderPop({ ...explainContent, fields: { ...explainContent.fields, 比較データ: [] } });
  assert.ok(!html.includes('class="charts"'));
});

test('renderPop: 不明な type は throw', () => {
  assert.throws(() => t.renderPop({ type: 'x', variant: 'v1', catch: '', fields: {} }));
});
