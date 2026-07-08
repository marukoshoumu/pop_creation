const { test } = require('node:test');
const assert = require('node:assert');
const v = require('../src/validation.js');

test('parseGeminiJson: ```json フェンスを除去してパース', () => {
  const raw = '```json\n{"商品名":"わさびパウダー"}\n```';
  assert.deepStrictEqual(v.parseGeminiJson(raw), { 商品名: 'わさびパウダー' });
});

test('parseGeminiJson: フェンス無しもパース', () => {
  assert.deepStrictEqual(v.parseGeminiJson('{"a":1}'), { a: 1 });
});

test('parseGeminiJson: 不正 JSON は throw', () => {
  assert.throws(() => v.parseGeminiJson('これはJSONではない'));
});

test('validateProductFields: 完全な応答', () => {
  const r = v.validateProductFields({
    商品名: 'わさびパウダー', 補足: '山葵粉末', 価格: 756, 容量: '10g',
    生産者: 'ふれあい広場', アピールポイント: ['真妻わさび100%'],
  });
  assert.strictEqual(r.fields.価格, 756);
  assert.deepStrictEqual(r.missing, []);
});

test('validateProductFields: 欠け・型違いは空値化して missing に列挙', () => {
  const r = v.validateProductFields({ 商品名: 'きゅうり', 価格: '不明' });
  assert.strictEqual(r.fields.価格, null);
  assert.strictEqual(r.fields.容量, '');
  assert.deepStrictEqual(r.fields.アピールポイント, []);
  assert.ok(r.missing.includes('価格'));
  assert.ok(r.missing.includes('容量'));
  assert.ok(!r.missing.includes('商品名'));
});

test('validateProductFields: 価格は数値文字列なら数値化', () => {
  const r = v.validateProductFields({ 商品名: 'x', 価格: '756' });
  assert.strictEqual(r.fields.価格, 756);
});

test('validateExplainFields: 比較データの数値検証', () => {
  const r = v.validateExplainFields({
    フック: 'パンにも', 主題: '全粒粉のいいところ', 説明文: '…',
    箇条書き: ['食物繊維たっぷり'],
    比較データ: [
      { ラベル: 'ビタミンE', 対象値: 4, 比較値: 1, 単位: '倍', 補足: '' },
      { ラベル: '壊れ', 対象値: 'abc', 比較値: 1 },
    ],
  });
  assert.strictEqual(r.fields.比較データ.length, 1);
  assert.strictEqual(r.fields.比較データ[0].ラベル, 'ビタミンE');
});
