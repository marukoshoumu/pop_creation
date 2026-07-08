/**
 * POP テンプレート（純粋関数）。ブラウザ（build 生成の popTemplatesJs.html）と
 * Node テストの両方から使う。GAS サーバーでは使わない。
 * 【生命線】fields の値は escapeHtml 以外の加工をせずそのまま出力する。
 */

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function priceHtml_(価格) {
  if (価格 === null || 価格 === undefined || 価格 === '') return '';
  return '<span class="price">' + escapeHtml(価格) +
    '<span class="yen">円</span><span class="tax">（税込）</span></span>';
}

function renderProduct_(c) {
  var f = c.fields;
  return [
    '<div class="pop shelf ' + escapeHtml(c.variant) + '">',
    '  <div class="catch">' + escapeHtml(c.catch) + '</div>',
    '  <div class="name-row"><span class="name">' + escapeHtml(f.商品名) + '</span>',
    f.補足 ? '  <span class="reading">' + escapeHtml(f.補足) + '</span>' : '',
    '  </div>',
    '  <div class="bottom">',
    '    <span class="producer">' + escapeHtml(f.生産者) + '</span>',
    '    <span class="amount">' + escapeHtml(f.容量) + '</span>',
    '    ' + priceHtml_(f.価格),
    '  </div>',
    '</div>',
  ].join('\n');
}

function chartHtml_(list) {
  if (!list || list.length === 0) return '';
  var items = list.filter(function (d) {
    // 0除算・不正値ガード: 比較値が有限かつ 0 超でない項目はグラフに出さない
    return isFinite(d.対象値) && isFinite(d.比較値) && d.比較値 > 0;
  }).slice(0, 2).map(function (d) {
    var ratio = d.対象値 / d.比較値;
    var mainH = 96;                                    // 対象バーは常に 96%
    var baseH = (isFinite(ratio) && ratio > 0)
      ? Math.max(10, Math.min(96, Math.round(96 / ratio)))  // 比較バーは比率で縮小
      : 10;                                                  // ratio が 0/NaN/Infinity は下限値
    var label = escapeHtml(ratio) + escapeHtml(d.単位 || '倍') + '！';
    return [
      '<div class="chart">',
      '  <div class="bars">',
      '    <div class="bar g" style="height:' + mainH + '%"><span class="x">' + label + '</span></div>',
      '    <div class="bar w" style="height:' + baseH + '%"></div>',
      '  </div>',
      '  <div class="cap">' + escapeHtml(d.ラベル) + (d.補足 ? '（' + escapeHtml(d.補足) + '）' : '') + '</div>',
      '</div>',
    ].join('\n');
  });
  if (items.length === 0) return '';
  return '<div class="charts">' + items.join('\n') + '</div>';
}

function explainListHtml_(bullets) {
  var li = (bullets || []).map(function (s) {
    return '<li><span class="mark">✔</span><span>' + escapeHtml(s) + '</span></li>';
  }).join('\n');
  return li ? '<ul class="list">' + li + '</ul>' : '';
}

function numberCardsHtml_(list) {
  var cls = ['g', 'p'];
  var items = (list || []).filter(function (d) {
    return isFinite(d.対象値) && isFinite(d.比較値) && d.比較値 > 0;
  }).slice(0, 2);
  if (items.length === 0) return '';
  var cards = items.map(function (d, i) {
    var ratio = d.対象値 / d.比較値;
    return '<div class="numcard ' + cls[i % 2] + '">' +
      '<div class="label">' + escapeHtml(d.ラベル) + '</div>' +
      '<div class="big">' + escapeHtml(ratio) + escapeHtml(d.単位 || '倍') + '！</div>' +
      (d.補足 ? '<div class="vs">' + escapeHtml(d.補足) + '</div>' : '') +
      '</div>';
  }).join('');
  return '<div class="numbers">' + cards + '</div>';
}

function pointCardsHtml_(bullets) {
  var items = (bullets || []).slice(0, 4);
  if (items.length === 0) return '';
  var rows = items.map(function (s) {
    return '<div class="pointbox">' + escapeHtml(s) + '</div>';
  }).join('');
  return '<div class="pointlist">' + rows + '</div>';
}

/**
 * 説明型は変種ごとに別レイアウト（モック準拠）。
 * e1 問いかけ型 / e2 数字インパクト型 / e3 やさしい解説型。
 * 比較データが無い場合も箇条書きで見栄えするようフォールバックする。
 */
function renderExplain_(c) {
  var f = c.fields;
  var v = (c.variant === 'e2' || c.variant === 'e3') ? c.variant : 'e1';
  var parts = ['<div class="pop a4 ' + escapeHtml(c.variant) + '">', '<div class="tape"></div>'];

  if (v === 'e2') {
    // 数字インパクト型: 比較データを数字カードに。無ければ箇条書きを要点カードに。
    parts.push('<div class="theme">' + escapeHtml(c.catch) + '</div>');
    parts.push(numberCardsHtml_(f.比較データ) || pointCardsHtml_(f.箇条書き));
    if (f.説明文) parts.push('<div class="body-text">' + escapeHtml(f.説明文) + '</div>');
    parts.push('<div class="foot">' + escapeHtml(f.主題) + '、いかがですか？</div>');
  } else if (v === 'e3') {
    // やさしい解説型: 箇条書き中心。
    if (f.フック) parts.push('<div class="hook">' + escapeHtml(f.フック) + '</div>');
    parts.push('<div class="theme">' + escapeHtml(f.主題) + '</div>');
    parts.push(explainListHtml_(f.箇条書き) ||
      (f.説明文 ? '<div class="body-text">' + escapeHtml(f.説明文) + '</div>' : ''));
    parts.push('<div class="foot">' + escapeHtml(c.catch) + '</div>');
  } else {
    // e1 問いかけ型: キャッチを問いかけ見出しに。棒グラフ＋要点リストで紙面を埋める。
    parts.push('<div class="q">' + escapeHtml(c.catch) + '</div>');
    parts.push('<div class="theme">' + escapeHtml(f.主題) + '</div>');
    var e1charts = chartHtml_(f.比較データ);
    var e1list = explainListHtml_(f.箇条書き);
    parts.push(e1charts);
    parts.push(e1list);
    if (!e1charts && !e1list && f.説明文) parts.push('<div class="body-text">' + escapeHtml(f.説明文) + '</div>');
    parts.push('<div class="foot">' + escapeHtml(f.説明文 || f.フック || '') + '</div>');
  }
  parts.push('</div>');
  return parts.filter(Boolean).join('\n');
}

function renderPop(content) {
  if (content.type === 'product') return renderProduct_(content);
  if (content.type === 'explain') return renderExplain_(content);
  throw new Error('不明な POP 種別: ' + content.type);
}

if (typeof module !== 'undefined') {
  module.exports = { renderPop, escapeHtml };
}
