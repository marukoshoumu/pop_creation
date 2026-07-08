/** Gemini API 呼び出し（サーバー側のみ）。呼び出しは 1 作成につき最大 2 回 */

function geminiEndpoint_() {
  var c = getConfig_();
  return 'https://generativelanguage.googleapis.com/v1beta/models/' + c.model +
    ':generateContent?key=' + c.apiKey;
}

/** 呼び出し + 応答の形状検証 + JSON パースまでを担う。パース済みオブジェクトを返す */
function callGemini_(payload) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  var lastErr;
  for (var attempt = 0; attempt < 2; attempt++) {  // 自動リトライ 1 回
    try {
      var res = UrlFetchApp.fetch(geminiEndpoint_(), options);
      var code = res.getResponseCode();
      var body = res.getContentText();
      if (code === 429) {
        var quotaErr = new Error('AIの利用枠が一時的に上限です。時間をおいて再試行するか、テキスト入力をご利用ください。');
        quotaErr.noRetry = true;  // 429 はリトライしない
        throw quotaErr;
      }
      if (code !== 200) {
        Logger.log('Gemini error ' + code + ': ' + body);
        throw new Error('AI処理に失敗しました（コード ' + code + '）。もう一度お試しください。');
      }
      var json = JSON.parse(body);
      var candidate = json.candidates && json.candidates[0];
      var text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] &&
        candidate.content.parts[0].text;
      if (!text) {
        throw new Error('AIからの応答を読み取れませんでした。もう一度お試しください。');
      }
      try {
        return parseGeminiJson(text);
      } catch (parseErr) {
        Logger.log('Gemini JSON parse error: ' + parseErr + ' / text=' + text);
        throw new Error('AIの応答を解釈できませんでした。もう一度お試しください。');
      }
    } catch (e) {
      lastErr = e;
      if (e.noRetry) throw e;
    }
  }
  throw lastErr;
}

function extractContent(input, popType) {
  // spec: AIと保存は独立して壊れうるべき。Spreadsheet障害で抽出まで巻き添えにしない
  var extra = '';
  try {
    extra = getSettings()['プロンプト追加指示'] || '';
  } catch (e) {
    Logger.log('設定取得スキップ（プロンプト追加指示なしで続行）: ' + e.message);
  }
  var prompt = buildExtractPrompt(popType, extra);
  var schema = popType === 'product' ? EXTRACT_SCHEMA_PRODUCT : EXTRACT_SCHEMA_EXPLAIN;
  var reqOpts = { prompt: prompt, schema: schema };
  if (input.audio) {
    reqOpts.audio = input.audio;
  } else {
    reqOpts.prompt = prompt + '\n\nインタビュー内容:\n' + input.text;
  }
  var obj = callGemini_(buildGeminiRequest(reqOpts));
  return popType === 'product' ? validateProductFields(obj) : validateExplainFields(obj);
}

function generateCatches(fields, popType) {
  var obj = callGemini_(buildGeminiRequest({
    prompt: buildCatchesPrompt(fields, popType),
    schema: CATCHES_SCHEMA,
  }));
  var list = (obj['案'] || []).filter(function (a) { return a && a['キャッチ']; }).slice(0, 3);
  if (list.length === 0) throw new Error('キャッチ案を作れませんでした。もう一度お試しください。');
  return list;
}

/** GAS エディタから手動実行するスモークテスト */
function smokeGemini() {
  var r = extractContent({
    text: '生産者の佐藤さん。真妻という一番いい品種のわさびだけを粉にした。水で溶くだけでおろしたてみたいな香り。10gで756円。',
  }, 'product');
  Logger.log(JSON.stringify(r, null, 2));
  Logger.log(JSON.stringify(generateCatches(r.fields, 'product'), null, 2));
}
