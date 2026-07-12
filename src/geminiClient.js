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

function generateCatches(fields, popType, avoid) {
  var obj = callGemini_(buildGeminiRequest({
    prompt: buildCatchesPrompt(fields, popType, avoid),
    schema: CATCHES_SCHEMA,
  }));
  var list = (obj['案'] || []).filter(function (a) { return a && a['キャッチ']; }).slice(0, 3);
  if (list.length === 0) throw new Error('キャッチ案を作れませんでした。もう一度お試しください。');
  return list;
}

/* ===== 顔写真→似顔絵イラスト（生産者マスタ登録時のみ呼ばれる） ===== */

/**
 * 顔写真から似顔絵イラストを1枚生成する。写真はAPIに送るだけで保存しない。
 * 戻り値: { mimeType, base64 }（PNG想定）
 */
function generatePortrait(photo, touch) {
  var c = getConfig_();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + c.imageModel +
    ':generateContent?key=' + c.apiKey;
  var payload = {
    contents: [{
      parts: [
        { inlineData: { mimeType: photo.mimeType, data: photo.base64 } },
        { text: buildPortraitPrompt(touch) },
      ],
    }],
  };
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };
  var lastErr;
  for (var attempt = 0; attempt < 2; attempt++) {  // 自動リトライ 1 回
    try {
      var res = UrlFetchApp.fetch(url, options);
      var code = res.getResponseCode();
      if (code === 429) {
        var quotaErr = new Error('AIの利用枠が一時的に上限です。時間をおいてお試しください。');
        quotaErr.noRetry = true;
        throw quotaErr;
      }
      if (code !== 200) {
        Logger.log('Gemini image error ' + code + ': ' + res.getContentText());
        throw new Error('イラスト生成に失敗しました（コード ' + code + '）。もう一度お試しください。');
      }
      var json = JSON.parse(res.getContentText());
      var parts = (((json.candidates || [])[0] || {}).content || {}).parts || [];
      for (var i = 0; i < parts.length; i++) {
        var d = parts[i].inlineData;
        if (d && d.data && String(d.mimeType || '').indexOf('image/') === 0) {
          return { mimeType: d.mimeType, base64: d.data };
        }
      }
      throw new Error('AIがイラストを返しませんでした。別の写真でお試しください。');
    } catch (e) {
      lastErr = e;
      if (e.noRetry) throw e;
    }
  }
  throw lastErr;
}

/** GAS エディタから手動実行するスモークテスト */
function smokeGemini() {
  var r = extractContent({
    text: '生産者の佐藤さん。真妻という一番いい品種のわさびだけを粉にした。水で溶くだけでおろしたてみたいな香り。10gで756円。',
  }, 'product');
  Logger.log(JSON.stringify(r, null, 2));
  Logger.log(JSON.stringify(generateCatches(r.fields, 'product'), null, 2));
}

/** 似顔絵生成のスモークテスト: Drive に写真を置き、そのファイルIDを入れて手動実行 */
function smokePortrait() {
  var photoFileId = 'ここに写真のDriveファイルIDを入れて実行';
  var blob = DriveApp.getFileById(photoFileId).getBlob();
  var r = generatePortrait(
    { mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) }, 'suisai');
  Logger.log('portrait: ' + r.mimeType + ' / 約' + Math.round(r.base64.length * 3 / 4 / 1024) + 'KB');
}
