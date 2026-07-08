/**
 * Gemini 応答の検証（純粋関数・Node テスト可能）
 * 方針: 欠け・型違いはエラーにせず空値で通し missing に列挙（画面3で人が埋める）
 */

function parseGeminiJson(text) {
  let t = String(text);
  const m = t.match(/```json\s*([\s\S]*?)\s*```/);
  if (m) t = m[1];
  return JSON.parse(t.trim());
}

function asString_(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function asNumber_(v) {
  if (typeof v === 'number' && isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v);
  return null;
}

function asStringArray_(v) {
  if (!Array.isArray(v)) return [];
  return v.map(asString_).filter(function (s) { return s !== ''; });
}

function validateProductFields(obj) {
  const o = obj || {};
  const fields = {
    商品名: asString_(o['商品名']),
    補足: asString_(o['補足']),
    価格: asNumber_(o['価格']),
    容量: asString_(o['容量']),
    生産者: asString_(o['生産者']),
    アピールポイント: asStringArray_(o['アピールポイント']),
  };
  const missing = [];
  if (!fields.商品名) missing.push('商品名');
  if (fields.価格 === null) missing.push('価格');
  if (!fields.容量) missing.push('容量');
  if (!fields.生産者) missing.push('生産者');
  return { fields: fields, missing: missing };
}

function validateExplainFields(obj) {
  const o = obj || {};
  const 比較データ = (Array.isArray(o['比較データ']) ? o['比較データ'] : [])
    .map(function (d) {
      d = d || {};
      return {
        ラベル: asString_(d['ラベル']),
        対象値: asNumber_(d['対象値']),
        比較値: asNumber_(d['比較値']),
        単位: asString_(d['単位']),
        補足: asString_(d['補足']),
      };
    })
    .filter(function (d) { return d.ラベル && d.対象値 !== null && d.比較値 !== null; });
  const fields = {
    フック: asString_(o['フック']),
    主題: asString_(o['主題']),
    説明文: asString_(o['説明文']),
    箇条書き: asStringArray_(o['箇条書き']),
    比較データ: 比較データ,
  };
  const missing = [];
  if (!fields.主題) missing.push('主題');
  if (!fields.説明文 && fields.箇条書き.length === 0) missing.push('説明文または箇条書き');
  return { fields: fields, missing: missing };
}

// Node テスト用エクスポート（GAS では module が未定義なので無視される）
if (typeof module !== 'undefined') {
  module.exports = { parseGeminiJson, validateProductFields, validateExplainFields };
}
