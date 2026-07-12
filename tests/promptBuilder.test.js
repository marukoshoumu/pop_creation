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

test('buildCatchesPrompt: 人間らしさルール（短さ・文体3型・禁止語・非カタログ）', () => {
  const s = p.buildCatchesPrompt({ 商品名: 'トマト' }, 'product');
  assert.ok(s.includes('8〜18文字'), '文字数指定がない');
  assert.ok(s.includes('問いかけ型') && s.includes('数字・事実型') && s.includes('本音・つぶやき型'),
    '3つの文体型がない');
  assert.ok(s.includes('「美味しい」') && s.includes('禁止'), '汎用ほめ言葉の禁止がない');
  assert.ok(s.includes('オノマトペ'), 'オノマトペの指示がない');
  assert.ok(s.includes('カタログ'), '非カタログ文体の指示がない');
  assert.ok(s.includes('4文字以内'), '切り口ラベル長の指示がない');
});

test('buildCatchesPrompt: avoid 指定で回避リストが付く / 無指定なら付かない', () => {
  const avoid = ['朝どりの香り、そのまま', 'シャキッと甘い'];
  const s = p.buildCatchesPrompt({ 商品名: 'トマト' }, 'product', avoid);
  assert.ok(s.includes('似た言い回しは避けて'), '回避指示がない');
  avoid.forEach((a) => assert.ok(s.includes(a), a + ' が回避リストにない'));
  const s2 = p.buildCatchesPrompt({ 商品名: 'トマト' }, 'product');
  assert.ok(!s2.includes('似た言い回しは避けて'), '無指定なのに回避指示が付いた');
  const s3 = p.buildCatchesPrompt({ 商品名: 'トマト' }, 'product', []);
  assert.ok(!s3.includes('似た言い回しは避けて'), '空配列なのに回避指示が付いた');
});

test('buildExtractPrompt: 話し言葉・非カタログ文体の指示を含む', () => {
  assert.ok(p.buildExtractPrompt('product', '').includes('体言止め'),
    '商品型アピールポイントの文体指示がない');
  const e = p.buildExtractPrompt('explain', '');
  assert.ok(e.includes('話し言葉') && e.includes('カタログ'), '説明型の文体指示がない');
});

test('buildPortraitPrompt: 文字を描かない制約とタッチ切替（不正は水彩）', () => {
  const s = p.buildPortraitPrompt('suisai');
  assert.ok(s.includes('文字') && s.includes('描かない'), '文字禁止の指示がない');
  assert.ok(s.includes('水彩'), '水彩タッチがない');
  assert.ok(s.includes('クローズアップ') && s.includes('白一色'), '構図指定がない');
  assert.ok(s.includes('全身') && s.includes('描かない'), '全身を描かない指示がない');
  assert.ok(p.buildPortraitPrompt('enpitsu').includes('色鉛筆'));
  assert.ok(p.buildPortraitPrompt('senga').includes('線画'));
  assert.ok(p.buildPortraitPrompt('xxx').includes('水彩'), '不正タッチが水彩にフォールバックしない');
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
