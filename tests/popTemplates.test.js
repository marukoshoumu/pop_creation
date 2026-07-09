const { test } = require('node:test');
const assert = require('node:assert');
const t = require('../shared/popTemplates.js');

const productContent = {
  type: 'product', variant: 'v1', catchAngle: '驚き', fontTheme: 'fude',
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

test('renderPop(product): variant と fontTheme がルートクラスに反映', () => {
  const h1 = t.renderPop(productContent);
  assert.ok(h1.includes('shelf v1'), 'variant クラスがない');
  assert.ok(h1.includes('theme-fude'), 'フォントテーマクラスがない');
  assert.ok(t.renderPop({ ...productContent, variant: 'v2' }).includes('shelf v2'));
  assert.ok(t.renderPop({ ...productContent, fontTheme: 'pop' }).includes('theme-pop'));
});

test('renderPop(product): fontTheme 未指定/不正は theme-fude にフォールバック', () => {
  assert.ok(t.renderPop({ ...productContent, fontTheme: undefined }).includes('theme-fude'));
  assert.ok(t.renderPop({ ...productContent, fontTheme: 'xxx' }).includes('theme-fude'));
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
  type: 'explain', variant: 'e1', catchAngle: '問いかけ', fontTheme: 'fude',
  catch: '全粒粉ってどうして身体にいいの？',
  fields: {
    フック: 'パンにも、お菓子にも。', 主題: '小麦 全粒粉', 説明文: '外皮も胚芽もまるごと。',
    箇条書き: ['食物繊維たっぷり', '鉄分は3倍'],
    比較データ: [{ ラベル: 'ビタミンE', 対象値: 4, 比較値: 1, 単位: '倍', 補足: '抗酸化' }],
  },
};

test('renderPop(explain): e1 は棒グラフになり倍率が正確、ルートクラスに variant/theme', () => {
  const html = t.renderPop(explainContent);
  assert.ok(html.includes('a4 e1'), 'variant クラスがない');
  assert.ok(html.includes('theme-fude'), 'テーマクラスがない');
  assert.ok(html.includes('4倍'), '倍率表示がない');
  assert.ok(html.includes('class="charts"'), '棒グラフが出ていない');
  assert.ok(html.includes('height:100%'), '対象バーが 100% で出ていない');
});

test('renderPop(explain): e2 数字インパクト型は数字カードを出す', () => {
  const html = t.renderPop({ ...explainContent, variant: 'e2' });
  assert.ok(html.includes('a4 e2'));
  assert.ok(html.includes('class="numbers"'), '数字カードが出ていない');
  assert.ok(html.includes('4倍'));
});

test('renderPop(explain): e2 比較データ無しは箇条書きを囲みボックスに', () => {
  const html = t.renderPop({ ...explainContent, variant: 'e2', fields: { ...explainContent.fields, 比較データ: [] } });
  assert.ok(!html.includes('class="numbers"'), '比較データ無しで数字カードが出ている');
  assert.ok(html.includes('class="pointlist"'), '囲みボックスが出ていない');
});

test('renderPop(explain): e3 やさしい解説型はチェックリストを出す', () => {
  const html = t.renderPop({ ...explainContent, variant: 'e3' });
  assert.ok(html.includes('a4 e3'));
  assert.ok(html.includes('class="list"'), 'チェックリストが出ていない');
  assert.ok(html.includes('食物繊維たっぷり'));
});

test('renderPop(explain): 比較値 0 の項目は0除算を防ぎ Infinity/NaN を出さない', () => {
  const html = t.renderPop({
    ...explainContent,
    fields: { ...explainContent.fields, 比較データ: [{ ラベル: '糖質', 対象値: 5, 比較値: 0, 単位: 'g', 補足: '' }] },
  });
  assert.ok(!html.includes('Infinity'));
  assert.ok(!html.includes('NaN'));
  assert.ok(!html.includes('class="charts"'), '比較値0の項目はグラフに出ないはず');
});

test('renderPop(explain): 対象値0・比較値正（0倍）でも Infinity/NaN を出さず比較バーが有効な数値%', () => {
  const html = t.renderPop({
    ...explainContent,
    fields: { ...explainContent.fields, 比較データ: [{ ラベル: 'カフェイン', 対象値: 0, 比較値: 100, 単位: '倍', 補足: '' }] },
  });
  assert.ok(!html.includes('Infinity'));
  assert.ok(!html.includes('NaN'));
  assert.ok(html.includes('class="charts"'), '対象値0でもグラフ自体は出るはず');
  const m = html.match(/bar lo" style="height:([\d.]+)%"/);
  assert.ok(m, '比較バーの height が数値%で出力されていない');
  const h = Number(m[1]);
  assert.ok(Number.isFinite(h) && h > 0 && h <= 96, `比較バー高さが不正: ${m && m[1]}`);
});

test('renderPop(explain): e1 比較データ 0 件ならグラフを出さず箇条書きにフォールバック', () => {
  const html = t.renderPop({ ...explainContent, fields: { ...explainContent.fields, 比較データ: [] } });
  assert.ok(!html.includes('class="charts"'));
  assert.ok(html.includes('class="list"'), '箇条書きフォールバックが出ていない');
});

test('renderPop: 不明な type は throw', () => {
  assert.throws(() => t.renderPop({ type: 'x', variant: 'v1', catch: '', fields: {} }));
});

test('renderPop: fontScale が --fs スタイルに反映される（1は付けない）', () => {
  assert.ok(!t.renderPop(productContent).includes('--fs'), 'scale=既定で --fs が付いている');
  assert.ok(t.renderPop({ ...productContent, fontScale: 1.15 }).includes('style="--fs:1.15"'));
  assert.ok(t.renderPop({ ...explainContent, fontScale: 0.85 }).includes('style="--fs:0.85"'));
});

test('renderPop: キャッチの改行が <br> になる（商品名など他フィールドは改行しない）', () => {
  const html = t.renderPop({ ...productContent, catch: 'あまい！\nメロン超え' });
  assert.ok(html.includes('あまい！<br>メロン超え'), 'キャッチの改行が反映されない');
});
