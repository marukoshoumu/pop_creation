/**
 * Gemini プロンプト・リクエスト組み立て（純粋関数・Node テスト可能）
 */

var EXTRACT_SCHEMA_PRODUCT = {
  type: 'OBJECT',
  properties: {
    商品名: { type: 'STRING' },
    補足: { type: 'STRING', description: 'よみ・別名。例: 山葵粉末' },
    価格: { type: 'NUMBER', nullable: true },
    容量: { type: 'STRING', description: '例: 10g、3本' },
    生産者: { type: 'STRING' },
    アピールポイント: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['商品名', 'アピールポイント'],
};

var EXTRACT_SCHEMA_EXPLAIN = {
  type: 'OBJECT',
  properties: {
    フック: { type: 'STRING', description: '興味を引く一言' },
    主題: { type: 'STRING' },
    説明文: { type: 'STRING' },
    箇条書き: { type: 'ARRAY', items: { type: 'STRING' } },
    比較データ: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ラベル: { type: 'STRING' },
          対象値: { type: 'NUMBER' },
          比較値: { type: 'NUMBER' },
          単位: { type: 'STRING' },
          補足: { type: 'STRING' },
        },
        required: ['ラベル', '対象値', '比較値'],
      },
    },
  },
  required: ['主題'],
};

var CATCHES_SCHEMA = {
  type: 'OBJECT',
  properties: {
    案: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          切り口: { type: 'STRING', description: '例: 驚き、手軽さ、希少さ' },
          キャッチ: { type: 'STRING' },
        },
        required: ['切り口', 'キャッチ'],
      },
    },
  },
  required: ['案'],
};

function buildExtractPrompt(popType, extra) {
  var base;
  if (popType === 'product') {
    base = [
      'あなたは産直売り場のPOP作成アシスタントです。',
      '以下の生産者インタビュー（音声の場合は聞き取ってから）から、商品POPに使う情報を抽出してください。',
      '抽出項目: 商品名 / 補足（よみ・別名）/ 価格（税込・数値のみ）/ 容量 / 生産者（人名または売り場名）/ アピールポイント（3〜5個の短文）。',
      'わからない項目は無理に推測せず null または空にしてください。',
      '価格はインタビュー中で明言された数値だけを使い、絶対に創作しないでください。',
    ].join('\n');
  } else {
    base = [
      'あなたは産直売り場のPOP作成アシスタントです。',
      '以下の生産者インタビュー（音声の場合は聞き取ってから）から、説明POP（A4掲示）に使う情報を抽出してください。',
      '抽出項目: フック（興味を引く一言）/ 主題 / 説明文（2〜3文）/ 箇条書き（3〜5個）/ 比較データ（「◯◯がふつうの△倍」のような数値比較。ラベル・対象値・比較値・単位・補足）。',
      'わからない項目は無理に推測せず空にしてください。数値は明言されたものだけを使ってください。',
    ].join('\n');
  }
  if (extra) base += '\n追加指示: ' + extra;
  return base;
}

function buildCatchesPrompt(fields, popType) {
  return [
    'あなたは産直売り場のPOPコピーライターです。',
    '以下の確定済み商品情報をもとに、切り口の異なるキャッチコピーを3案作ってください。',
    '各案: 切り口（例: 驚き・手軽さ・希少さ・季節感）と、キャッチ本文（20〜35文字・話し言葉で温かく）。',
    '重要: 価格・商品名・容量はキャッチ本文に含めず、変更・言い換えもしないでください（別枠で印字されます）。',
    '誇大表現（日本一、絶対、100%安全 など根拠のない断定）は使わないでください。',
    '',
    '商品情報:',
    JSON.stringify(fields),
    '種別: ' + (popType === 'product' ? '商品型（棚札）' : '説明型（A4）'),
  ].join('\n');
}

function buildGeminiRequest(opts) {
  var parts = [];
  if (opts.audio) {
    parts.push({ inlineData: { mimeType: opts.audio.mimeType, data: opts.audio.base64 } });
  }
  parts.push({ text: opts.prompt });
  return {
    contents: [{ parts: parts }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.schema,
      temperature: opts.audio ? 0.2 : 0.7,
    },
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildExtractPrompt, buildCatchesPrompt, buildGeminiRequest,
    EXTRACT_SCHEMA_PRODUCT, EXTRACT_SCHEMA_EXPLAIN, CATCHES_SCHEMA,
  };
}
