/**
 * Gemini プロンプト・リクエスト組み立て（純粋関数・Node テスト可能）
 */

var EXTRACT_SCHEMA_PRODUCT = {
  type: 'OBJECT',
  properties: {
    商品名: { type: 'STRING' },
    補足: { type: 'STRING', description: 'よみ・別名。例: 山葵粉末' },
    価格: { type: 'STRING', nullable: true, description: '税込価格。単一価格なら数字のみ（例: 756）。複数・範囲は言われたとおり（例: S 300円/L 500円）。明言が無ければ空' },
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
      '抽出項目: 商品名 / 補足（よみ・別名）/ 価格（税込。単一なら数字のみ、複数はそのまま）/ 容量 / 生産者（人名または売り場名）/ アピールポイント（3〜5個の短文）/ 生産者のひとこと。',
      'アピールポイントは、カタログの売り文句ではなく現場の言葉で。体言止めの短文にしてください（例:「朝どり」「雪の下で越冬」「粉なのに香りが立つ」）。',
      '「生産者のひとこと」は、インタビュー中の生産者本人の言葉を一人称の話し言葉のままほぼそのまま抜き出してください（要約や敬語化で加工しない。方言もそのまま）。',
      'わからない項目は無理に推測せず null または空にしてください。ひとことも、本人の発言が無ければ創作せず空にしてください。',
      '価格はインタビュー中で明言されたものだけを使い、絶対に創作しないでください。単一価格は数字のみ（例: 756）、複数・範囲は言われたとおりの文字列にしてください。明言が無ければ空にしてください。',
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
 * キャッチ3案の生成プロンプト（鍵フレーズ抽出）。
 * avoid: 直前に生成したキャッチの配列（再生成で似た案を避ける）
 */
function buildCatchesPrompt(fields, popType, avoid) {
  var lines = [
    'あなたは産直POP用の見出し担当です。キャッチを「作る」のではなく、確定済み情報から鍵となるフレーズを抜き出します。',
    '以下の確定済み商品情報をもとに、内容の違う鍵フレーズを最大3案、抜き出してください。',
    '候補が足りない場合は1〜2案でも構いません。足りないからといって言い換えて埋めないでください。',
    '',
    '元ネタ（この中からだけ取る）:',
    '・アピールポイント、箇条書き、生産者のひとこと、主題、フック、説明文など、渡された確定フィールドの文言',
    '・インタビュー原文は渡されていません。創作で補わないでください',
    '',
    '抜き出しのルール:',
    '・原文の語順・語彙を保つ。同義の言い換え・比喩の追加・疑問文への変換・広告文への整形は禁止',
    '・長い場合のみ、意味が通る範囲で短く切る（例:「おろしたてみたいな香りになる」→「おろしたてみたいな香り」）',
    '・なるべく短く。切ってよい上限の目安は28文字（無理に28未満へ圧縮しなくてよい）',
    '・3案は内容が被らないこと（同じアピールの言い換えを並べない）',
    '・価格・商品名・容量はキャッチ本文に含めない（別枠で印字されます）',
    '・「美味しい」「絶品」「こだわり」「魅力」など汎用ほめ言葉を新たに足さない',
    '・誇大表現（日本一、絶対、根拠のない断定）は使わない・足さない',
    '・切り口はPOPに印刷される短いラベル。中身を示す語で4文字以内（例: 香り、品種、使い方、栄養）',
  ];
  if (avoid && avoid.length) {
    lines.push('', '前回の案と似たフレーズは避けてください。前回の案:');
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
    '構図: 顔が主役のクローズアップ（頭から肩まで）。顔を大きく中央に描き、正方形の画面いっぱいに収めてください。',
    '全身・持ち物・背景の小物は描かないでください。背景は白一色。',
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
