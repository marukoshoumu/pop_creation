/** Gemini API 呼び出し（サーバー側のみ）。呼び出しは 1 作成につき最大 2 回 */

function geminiEndpoint_() {
  var c = getConfig_();
  return 'https://generativelanguage.googleapis.com/v1beta/models/' + c.model +
    ':generateContent?key=' + c.apiKey;
}

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
        throw new Error('AIの利用枠が一時的に上限です。時間をおいて再試行するか、テキスト入力をご利用ください。');
      }
      if (code !== 200) {
        Logger.log('Gemini error ' + code + ': ' + body);
        throw new Error('AI処理に失敗しました（コード ' + code + '）。もう一度お試しください。');
      }
      var json = JSON.parse(body);
      if (!json.candidates || !json.candidates.length) {
        throw new Error('AIからの応答が空でした。もう一度お試しください。');
      }
      return json.candidates[0].content.parts[0].text;
    } catch (e) {
      lastErr = e;
      if (String(e.message).indexOf('利用枠') >= 0) throw e;  // 429 はリトライしない
    }
  }
  throw lastErr;
}

function extractContent(input, popType) {
  var extra = (getSettings()['プロンプト追加指示'] || '');
  var prompt = buildExtractPrompt(popType, extra);
  var schema = popType === 'product' ? EXTRACT_SCHEMA_PRODUCT : EXTRACT_SCHEMA_EXPLAIN;
  var reqOpts = { prompt: prompt, schema: schema };
  if (input.audio) {
    reqOpts.audio = input.audio;
  } else {
    reqOpts.prompt = prompt + '\n\nインタビュー内容:\n' + input.text;
  }
  var text = callGemini_(buildGeminiRequest(reqOpts));
  var obj = parseGeminiJson(text);
  return popType === 'product' ? validateProductFields(obj) : validateExplainFields(obj);
}

function generateCatches(fields, popType) {
  var text = callGemini_(buildGeminiRequest({
    prompt: buildCatchesPrompt(fields, popType),
    schema: CATCHES_SCHEMA,
  }));
  var obj = parseGeminiJson(text);
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
