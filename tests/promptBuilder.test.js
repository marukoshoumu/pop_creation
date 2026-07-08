const { test } = require('node:test');
const assert = require('node:assert');
const p = require('../src/promptBuilder.js');

test('buildExtractPrompt(product): 必須項目の指示を含む', () => {
  const s = p.buildExtractPrompt('product', '');
  ['商品名', '価格', '容量', '生産者', 'アピールポイント'].forEach((k) =>
    assert.ok(s.includes(k), k + ' が含まれない'));
  assert.ok(s.includes('わからない項目は'), '不明時の指示がない');
});

test('buildExtractPrompt(explain): 説明型項目の指示を含む', () => {
  const s = p.buildExtractPrompt('explain', '');
  ['フック', '主題', '説明文', '箇条書き', '比較データ'].forEach((k) =>
    assert.ok(s.includes(k)));
});

test('buildExtractPrompt: 追加指示が末尾に付く', () => {
  const s = p.buildExtractPrompt('product', '方言はそのまま残す');
  assert.ok(s.includes('方言はそのまま残す'));
});

test('buildCatchesPrompt: 3案・切り口・変更禁止の指示', () => {
  const s = p.buildCatchesPrompt({ 商品名: 'わさびパウダー', 価格: 756 }, 'product');
  assert.ok(s.includes('3'));
  assert.ok(s.includes('切り口'));
  assert.ok(s.includes('価格') && s.includes('変更'), '価格変更禁止の指示がない');
  assert.ok(s.includes('わさびパウダー'), '確定内容が渡っていない');
});

test('buildGeminiRequest: テキストのみ', () => {
  const r = p.buildGeminiRequest({ prompt: 'テスト', schema: p.CATCHES_SCHEMA });
  assert.strictEqual(r.contents[0].parts.length, 1);
  assert.strictEqual(r.contents[0].parts[0].text, 'テスト');
  assert.strictEqual(r.generationConfig.responseMimeType, 'application/json');
  assert.ok(r.generationConfig.responseSchema);
});

test('buildGeminiRequest: 音声は inlineData が先頭', () => {
  const r = p.buildGeminiRequest({
    prompt: '文字起こしして抽出',
    schema: p.EXTRACT_SCHEMA_PRODUCT,
    audio: { mimeType: 'audio/mp4', base64: 'AAAA' },
  });
  assert.strictEqual(r.contents[0].parts.length, 2);
  assert.strictEqual(r.contents[0].parts[0].inlineData.mimeType, 'audio/mp4');
  assert.strictEqual(r.contents[0].parts[1].text, '文字起こしして抽出');
});
