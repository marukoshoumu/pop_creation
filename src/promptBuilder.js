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
    生産者のひとこと: { type: 'STRING', description: 'インタビュー中の生産者本人の言葉をほぼそのまま。一人称の話し言葉で1文（15〜40文字）。例:「今年は雪が多くて、そのぶん甘くなったよ」。無ければ空' },
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
    生産者: { type: 'STRING', description: '生産者の人名（例: 佐藤さん）。無ければ空' },
    生産者のひとこと: { type: 'STRING', description: 'インタビュー中の生産者本人の言葉をほぼそのまま。一人称の話し言葉で1文（15〜40文字）。無ければ空' },
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
      '抽出項目: 商品名 / 補足（よみ・別名）/ 価格（税込・数値のみ）/ 容量 / 生産者（人名または売り場名）/ アピールポイント（3〜5個の短文）/ 生産者のひとこと。',
      'アピールポイントは、カタログの売り文句ではなく現場の言葉で。体言止めの短文にしてください（例:「朝どり」「雪の下で越冬」「粉なのに香りが立つ」）。',
      '「生産者のひとこと」は、インタビュー中の生産者本人の言葉を一人称の話し言葉のままほぼそのまま抜き出してください（要約や敬語化で加工しない。方言もそのまま）。',
      'わからない項目は無理に推測せず null または空にしてください。ひとことも、本人の発言が無ければ創作せず空にしてください。',
      '価格はインタビュー中で明言された数値だけを使い、絶対に創作しないでください。',
    ].join('\n');
  } else {
    base = [
      'あなたは産直売り場のPOP作成アシスタントです。',
      '以下の生産者インタビュー（音声の場合は聞き取ってから）から、説明POP（A4掲示）に使う情報を抽出してください。',
      '抽出項目: フック（興味を引く一言）/ 主題 / 説明文（2〜3文）/ 箇条書き（3〜5個）/ 比較データ（「◯◯がふつうの△倍」のような数値比較。ラベル・対象値・比較値・単位・補足）/ 生産者（人名）/ 生産者のひとこと。',
      'フック・説明文・箇条書きは、広告やカタログの文体にせず、店員がお客さんに話すような短い話し言葉で書いてください。「〜です・〜ます」の丁寧文を積み重ねず、言い切りや体言止めを交ぜてください。',
      '「生産者のひとこと」は、インタビュー中の生産者本人の言葉を一人称の話し言葉のままほぼそのまま抜き出してください（要約や敬語化で加工しない。方言もそのまま）。本人の発言が無ければ創作せず空に。',
      'わからない項目は無理に推測せず空にしてください。数値は明言されたものだけを使ってください。',
    ].join('\n');
  }
  if (extra) base += '\n追加指示: ' + extra;
  return base;
}

/**
 * キャッチ3案の生成プロンプト。
 * avoid: 直前に生成したキャッチの配列（「別の言い回し」再生成で似た案を避ける）
 */
function buildCatchesPrompt(fields, popType, avoid) {
  var lines = [
    'あなたは産直売り場で毎日お客さんと立ち話をしている店員です。POPのキャッチコピーを考えます。',
    '以下の確定済み商品情報をもとに、文体の違うキャッチコピーを3案作ってください。',
    '',
    '3案の文体（この順で1案ずつ）:',
    '案1 問いかけ型: お客さんに話しかける疑問文。例:「アスパラ、生でかじったことある？」',
    '案2 数字・事実型: 具体的な数字や事実で言い切る。例:「糖度12度。フルーツみたい」',
    '案3 本音・つぶやき型: 生産者や店員の本音をぽろっと。小さな弱点に触れてもよい。例:「見た目は不揃い。味は自慢。」',
    '',
    '書き方のルール:',
    '・長さは8〜18文字。13文字前後がいちばん読まれます。完璧な文にせず、体言止めや言いさしでよい',
    '・「美味しい」「絶品」「こだわり」「魅力」のような誰でも言えるほめ言葉は禁止。かわりに具体的な事実・様子・食感で言う',
    '・オノマトペ（シャキシャキ、とろ〜り 等）は1案に1つまで',
    '・誇大表現（日本一、絶対、100%安全 など根拠のない断定）は使わない',
    '・広告や商品カタログの文体にしない。店先の手書きPOPの言葉にする',
    '・価格・商品名・容量はキャッチ本文に含めず、変更・言い換えもしない（別枠で印字されます）',
    '・「生産者のひとこと」がある場合は、その口調・温度感を手がかりにする',
    '・切り口はPOPに印刷される短いラベル。4文字以内（例: 旬、驚き、数字、本音）',
  ];
  if (avoid && avoid.length) {
    lines.push('', '前回の案と似た言い回しは避けてください。前回の案:');
    avoid.forEach(function (s) { lines.push('・' + s); });
  }
  lines.push(
    '',
    '商品情報:',
    JSON.stringify(fields),
    '種別: ' + (popType === 'product' ? '商品型（棚札）' : '説明型（A4）')
  );
  return lines.join('\n');
}

/* ===== 生産者の似顔絵（顔写真→イラスト化） ===== */
var PORTRAIT_TOUCHES = {
  suisai: 'やわらかい水彩画',
  enpitsu: 'あたたかみのある色鉛筆画',
  senga: 'シンプルでやわらかい線画（ペンの線に淡い色を少しだけ）',
};

/** 顔写真→似顔絵イラストの生成プロンプト。touch 不正時は水彩にフォールバック */
function buildPortraitPrompt(touch) {
  var style = PORTRAIT_TOUCHES[touch] || PORTRAIT_TOUCHES.suisai;
  return [
    'この写真の人物の似顔絵イラストを描いてください。産直売り場の手作りPOPに載せます。',
    'スタイル: ' + style + '。温かく親しみやすい雰囲気で、にこやかな表情に。',
    '構図: バストアップ（胸から上）。正方形。背景は白一色。',
    '本人の特徴（髪型・眼鏡・帽子・輪郭など）は保ってください。',
    '重要: 文字・数字・ロゴ・署名・透かしは一切描かないでください。イラストのみ。',
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
    buildExtractPrompt, buildCatchesPrompt, buildGeminiRequest, buildPortraitPrompt,
    EXTRACT_SCHEMA_PRODUCT, EXTRACT_SCHEMA_EXPLAIN, CATCHES_SCHEMA,
  };
}
