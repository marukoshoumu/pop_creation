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

test('renderPop(product): 価格が空なら price 要素ごと出さない（円・税込も出ない）', () => {
  [null, undefined, '', '  '].forEach((p) => {
    const html = t.renderPop({ ...productContent, fields: { ...productContent.fields, 価格: p } });
    assert.ok(!html.includes('class="price'), '空価格で price 要素が出ている: ' + JSON.stringify(p));
    assert.ok(!html.includes('（税込）'), '空価格で（税込）が出ている');
    assert.ok(!html.includes('null') && !html.includes('undefined'));
  });
});

test('renderPop(product): 数字のみの価格は円（税込）付き（旧数値データも互換）', () => {
  const h1 = t.renderPop({ ...productContent, fields: { ...productContent.fields, 価格: '1,000' } });
  assert.ok(h1.includes('1,000') && h1.includes('（税込）'));
  const h2 = t.renderPop(productContent);  // 価格: 756 (number)
  assert.ok(h2.includes('756') && h2.includes('（税込）'));
});

test('renderPop(product): 自由テキスト価格はそのまま印字・円（税込）を付けない', () => {
  const html = t.renderPop({ ...productContent, fields: { ...productContent.fields, 価格: 'S 300円 / L 500円' } });
  assert.ok(html.includes('S 300円 / L 500円'), '自由テキストがそのまま出ていない');
  assert.ok(html.includes('price free'), 'free クラスがない');
  assert.ok(!html.includes('（税込）'), '自由テキストに（税込）が付いている');
});

test('renderPop(product): 長い自由テキスト価格は long クラスで縮小', () => {
  const html = t.renderPop({ ...productContent, fields: { ...productContent.fields, 価格: '小袋300円・大袋500円・箱1,000円' } });
  assert.ok(html.includes('price free long'));
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

test('renderPop: キャッチの空行は1つの<br>にまとめ、手動改行時は manual クラスで行数制限を緩める', () => {
  const html = t.renderPop({ ...productContent, catch: 'おろしたて香る。\n\n真妻わさび100%' });
  assert.ok(html.includes('おろしたて香る。<br>真妻わさび100%'), '空行が<br>2つになり行数制限で文字が消える');
  assert.ok(html.includes('class="catch manual"'), '手動改行なのに manual クラスがない');
  assert.ok(t.renderPop(productContent).includes('class="catch"'), '改行なしなのに manual が付いた');
});

test('renderPop(product): 生産者のひとことが「」付きで foot に出る（既存の「」は二重にしない）', () => {
  const h1 = t.renderPop({ ...productContent, fields: { ...productContent.fields, 生産者のひとこと: '今年は特に香りがいいよ' } });
  assert.ok(h1.includes('「今年は特に香りがいいよ」'), 'ひとことが出ていない');
  assert.ok(h1.includes('class="ptag"'), '生産者名札が出ていない');
  const h2 = t.renderPop({ ...productContent, fields: { ...productContent.fields, 生産者のひとこと: '「もう括られてる」' } });
  assert.ok(h2.includes('「もう括られてる」') && !h2.includes('「「'), '「」が二重になっている');
});

test('renderPop(product): 長いひとこと（15文字以上）は long クラスで縮小表示', () => {
  const short = t.renderPop({ ...productContent, fields: { ...productContent.fields, 生産者のひとこと: '香りが自慢だよ' } });
  assert.ok(short.includes('class="pquote"'), '短文なのに long が付いた');
  const long = t.renderPop({ ...productContent, fields: { ...productContent.fields, 生産者のひとこと: '今年は雪が多くて、そのぶん甘くなったよ' } });
  assert.ok(long.includes('class="pquote long"'), '15文字以上なのに long が付かない');
});

test('renderPop(product): ひとこと無しなら pquote を出さない（名札は生産者名があれば出す）', () => {
  const html = t.renderPop(productContent);
  assert.ok(!html.includes('class="pquote"'));
  assert.ok(html.includes('class="ptag"'));
});

/* ===== 生産者の似顔絵 ===== */
const DATA_URI = 'data:image/png;base64,AAAA';

test('renderPop(product): 生産者イラストが名札の隣に丸枠で出る（無ければ出ない）', () => {
  const html = t.renderPop({ ...productContent, fields: { ...productContent.fields, 生産者イラスト: DATA_URI } });
  assert.ok(html.includes('class="pface"'), '似顔絵が出ていない');
  assert.ok(html.includes('src="' + DATA_URI + '"'));
  assert.ok(!t.renderPop(productContent).includes('pface'), 'イラスト無しなのに pface が出た');
});

test('renderPop: 生産者イラストはデータURI画像のみ許可（外部URL等は弾く）', () => {
  ['https://evil.example/x.png', 'javascript:alert(1)', 'data:text/html,<script>'].forEach((bad) => {
    const html = t.renderPop({ ...productContent, fields: { ...productContent.fields, 生産者イラスト: bad } });
    assert.ok(!html.includes('pface'), bad + ' が許可されてしまった');
  });
});

test('renderPop(explain): ひとこと＋イラストは吹き出しの横、イラストのみなら名札付き', () => {
  const both = t.renderPop({
    ...explainContent,
    fields: { ...explainContent.fields, 生産者: '佐藤さん', 生産者のひとこと: '香りが違うんだ', 生産者イラスト: DATA_URI },
  });
  assert.ok(both.includes('class="quote-row"'), '吹き出し横の行がない');
  assert.ok(both.includes('pface big'), '大きめ似顔絵がない');
  assert.ok(both.includes('class="quote"'), '吹き出しが消えた');
  const faceOnly = t.renderPop({
    ...explainContent,
    fields: { ...explainContent.fields, 生産者: '佐藤さん', 生産者イラスト: DATA_URI },
  });
  assert.ok(faceOnly.includes('quote-row noq'), 'イラストのみの行がない');
  assert.ok(faceOnly.includes('class="pname"') && faceOnly.includes('佐藤さん'), '名札がない');
});

/* ===== 微調整B-lite: 色あい・パーツ表示/位置 ===== */

test('renderPop: accent が accent-*/has-ac クラスになる（未指定・不正は付けない）', () => {
  assert.ok(t.renderPop({ ...productContent, accent: 'red' }).includes('accent-red has-ac'));
  assert.ok(t.renderPop({ ...explainContent, accent: 'green' }).includes('accent-green has-ac'));
  assert.ok(!t.renderPop(productContent).includes('has-ac'), '未指定なのに accent が付いた');
  assert.ok(!t.renderPop({ ...productContent, accent: 'xxx' }).includes('has-ac'), '不正値なのに accent が付いた');
});

test('renderPop(product): adjust.badge=false で切り口バッジを出さない', () => {
  assert.ok(t.renderPop(productContent).includes('class="zip"'), '既定でバッジが出ていない');
  assert.ok(t.renderPop({ ...productContent, adjust: { badge: true } }).includes('class="zip"'));
  assert.ok(!t.renderPop({ ...productContent, adjust: { badge: false } }).includes('class="zip"'),
    'badge=false なのにバッジが出ている');
});

test('renderPop(explain): adjust.stamp でスタンプの位置/非表示を切替', () => {
  const lively = { ...explainContent, decoTheme: 'lively' };
  const def = t.renderPop(lively);
  assert.ok(def.includes('class="stamp"'), '既定で右上スタンプが出ていない');
  assert.ok(!def.includes('stamp-tl') && !def.includes('stamp-off'));
  const tl = t.renderPop({ ...lively, adjust: { stamp: 'tl' } });
  assert.ok(tl.includes('class="stamp tl"'), '左上クラスが付いていない');
  assert.ok(tl.includes('stamp-tl'), 'ルートの stamp-tl がない');
  const off = t.renderPop({ ...lively, adjust: { stamp: 'off' } });
  assert.ok(!off.includes('class="stamp'), 'off なのにスタンプが出ている');
  assert.ok(off.includes('stamp-off'), 'ルートの stamp-off がない');
});

test('renderPop: adjust.psize/ppos が似顔絵の大きさ・位置クラスになる（既定は付けない）', () => {
  const withFace = { ...productContent, fields: { ...productContent.fields, 生産者イラスト: DATA_URI } };
  assert.ok(t.renderPop({ ...withFace, adjust: { psize: 'l', ppos: 'r' } }).includes('psize-l'));
  assert.ok(t.renderPop({ ...withFace, adjust: { psize: 'l', ppos: 'r' } }).includes('ppos-r'));
  assert.ok(t.renderPop({ ...explainContent, adjust: { psize: 's' } }).includes('psize-s'));
  const def = t.renderPop({ ...withFace, adjust: { psize: 'm', ppos: 'l' } });
  assert.ok(!def.includes('psize-') && !def.includes('ppos-'), '既定値なのにクラスが付いた');
});

test('renderPop: adjust.frame が frame-* クラスになる（不正・未指定は付けない）', () => {
  ['hand', 'dash', 'double', 'none'].forEach((f) => {
    assert.ok(t.renderPop({ ...productContent, adjust: { frame: f } }).includes('frame-' + f));
    assert.ok(t.renderPop({ ...explainContent, adjust: { frame: f } }).includes('frame-' + f));
  });
  assert.ok(!t.renderPop(productContent).includes('frame-'));
  assert.ok(!t.renderPop({ ...productContent, adjust: { frame: 'xxx' } }).includes('frame-'));
});

test('renderPop(product): adjust.sdeco で棚札の飾り（マステ/スタンプ）が出る', () => {
  assert.ok(!t.renderPop(productContent).includes('class="stamp'), '既定なのに飾りが出た');
  const tape = t.renderPop({ ...productContent, adjust: { sdeco: 'tape' } });
  assert.ok(tape.includes('tape l') && tape.includes('tape r'), 'マステが出ていない');
  const osusume = t.renderPop({ ...productContent, adjust: { sdeco: 'osusume' } });
  assert.ok(osusume.includes('class="stamp sh"') && osusume.includes('おす<br>すめ'),
    '「おす/すめ」の固定折返しになっていない');
  assert.ok(osusume.includes('sdeco-stamp'), 'キャッチ逃げ用のルートクラスがない');
  const shun = t.renderPop({ ...productContent, adjust: { sdeco: 'shun' } });
  assert.ok(shun.includes('stamp sh sk') && shun.includes('旬'));
});

test('renderPop(explain): 季節テーマのスタンプは sk クラス（インラインstyleを使わない）', () => {
  const html = t.renderPop({ ...explainContent, decoTheme: 'season' });
  assert.ok(html.includes('class="stamp sk"'), '季節スタンプの sk クラスがない');
  assert.ok(!html.includes('stamp" style='), 'スタンプにインラインstyleが残っている');
});

test('renderPop(explain): ひとことがあれば吹き出し（quote）が出て、e2 の定型文を置き換える', () => {
  const withQ = { ...explainContent.fields, 生産者: '佐藤さん', 生産者のひとこと: 'まるごと挽くから香りが違うんだ' };
  const e2 = t.renderPop({ ...explainContent, variant: 'e2', fields: withQ });
  assert.ok(e2.includes('class="quote"'), '吹き出しが出ていない');
  assert.ok(e2.includes('佐藤さんより'), '発言者名が出ていない');
  assert.ok(!e2.includes('いかがですか？'), 'ひとこと有り時も定型文が残っている');
  const e2noQ = t.renderPop({ ...explainContent, variant: 'e2' });
  assert.ok(e2noQ.includes('いかがですか？'), 'ひとこと無し時のフォールバック定型文が消えている');
  const e1 = t.renderPop({ ...explainContent, fields: withQ });
  assert.ok(e1.includes('class="quote"'), 'e1 に吹き出しが出ていない');
});
