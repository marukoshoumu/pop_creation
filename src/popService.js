/** クライアント向け API 層（google.script.run のターゲット） */

function api_processInput(req) {
  if (!req || (!req.text && !req.audio)) throw new Error('入力が空です。');
  return extractContent({ text: req.text, audio: req.audio }, req.popType);
}

function api_generateCatches(req) {
  return generateCatches(req.fields, req.popType);
}

function api_savePop(record, base64Png) {
  var pngId = '';
  var thumbnailSaved = false;
  if (base64Png) {
    try {
      pngId = saveThumbnail('tmp', base64Png);  // ID 確定前に保存し、後でリネーム
      thumbnailSaved = true;
    } catch (e) {
      Logger.log('サムネイル保存失敗: ' + e.message);  // spec: PNG 無しで履歴登録を続行
    }
  }
  var id = savePop({
    種別: record.種別, サイズ: record.サイズ, 商品名: record.商品名,
    内容JSON: record.内容JSON, PNGファイルID: pngId,
  });
  if (pngId) DriveApp.getFileById(pngId).setName(id + '.png');
  return { id: id, thumbnailSaved: thumbnailSaved };
}

function api_listPops() {
  return listPops(50).map(function (p) {
    // サムネは Drive 公開 URL でなく base64 で返す（アクセス権を Drive 側に依存させない）
    var thumb = '';
    if (p.PNGファイルID) {
      try {
        thumb = 'data:image/png;base64,' +
          Utilities.base64Encode(DriveApp.getFileById(p.PNGファイルID).getBlob().getBytes());
      } catch (e) { /* ファイル削除済みなら文字表示にフォールバック */ }
    }
    return { ID: p.ID, 作成日時: p.作成日時, 種別: p.種別, サイズ: p.サイズ, 商品名: p.商品名, サムネ: thumb, 内容JSON: p.内容JSON };
  });
}

function api_getPop(id) {
  return getPop(id);
}
