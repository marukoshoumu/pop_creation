/** クライアント向け API 層（google.script.run のターゲット） */

function api_processInput(req) {
  if (!req || (!req.text && !req.audio)) throw new Error('入力が空です。');
  return extractContent({ text: req.text, audio: req.audio }, req.popType);
}

function api_generateCatches(req) {
  var avoid = Array.isArray(req.avoid) ? req.avoid.filter(Boolean).slice(0, 9) : null;
  return generateCatches(req.fields, req.popType, avoid);
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
  var id;
  try {
    id = savePop({
      種別: record.種別, サイズ: record.サイズ, 商品名: record.商品名,
      内容JSON: record.内容JSON, PNGファイルID: pngId,
    });
  } catch (e) {
    if (pngId) {
      try {
        DriveApp.getFileById(pngId).setTrashed(true);  // 履歴登録失敗時、孤児化した tmp.png を掃除
      } catch (e2) {
        Logger.log('孤児ファイル削除失敗: ' + e2.message);
      }
    }
    throw e;  // 履歴登録の失敗はクライアントに正しく伝える
  }
  if (pngId) {
    try {
      DriveApp.getFileById(pngId).setName(id + '.png');
    } catch (e) {
      // spec: PNG 保存(リネーム)に失敗しても履歴登録は続行。id は成功として返す
      Logger.log('PNG リネーム失敗: ' + e.message);
      thumbnailSaved = false;
    }
  }
  return { id: id, thumbnailSaved: thumbnailSaved };
}

function api_listPops() {
  // サムネはクライアント側で内容JSONから実物描画するため、Drive PNG は取得しない（高速）
  return listPops(50).map(function (p) {
    return { ID: p.ID, 作成日時: p.作成日時, 種別: p.種別, サイズ: p.サイズ, 商品名: p.商品名, 内容JSON: p.内容JSON };
  });
}

function api_getPop(id) {
  return getPop(id);
}

/* ===== 生産者マスタ（顔イラスト） ===== */

function api_listProducers() {
  return listProducers();
}

var PORTRAIT_PHOTO_TYPES_ = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 };
var PORTRAIT_PHOTO_MAX_B64_ = 7 * 1024 * 1024;  // base64 で約7MB（実体約5MB）

/** 写真→似顔絵のプレビュー生成。写真は保存せず、イラストの base64 を返すだけ */
function api_generatePortrait(req) {
  var photo = req && req.photo;
  if (!photo || !photo.base64 || !PORTRAIT_PHOTO_TYPES_[photo.mimeType]) {
    throw new Error('顔写真（JPEG/PNG/WebP）を選んでください。');
  }
  if (String(photo.base64).length > PORTRAIT_PHOTO_MAX_B64_) {
    throw new Error('写真が大きすぎます。別の写真をお試しください。');
  }
  return generatePortrait(photo, req.touch);
}

/** プレビュー済みイラストを Drive+マスタに保存 */
function api_saveProducer(req) {
  var name = req && String(req.名前 || '').trim();
  if (!name) throw new Error('生産者の名前を入れてください。');
  if (!req.base64) throw new Error('先にイラストを作ってください。');
  return saveProducer({ 名前: name, タッチ: req.タッチ, mimeType: req.mimeType, base64: req.base64 });
}

/** POP描画用にイラストを base64 で返す */
function api_getPortrait(fileId) {
  if (!fileId) throw new Error('イラストが指定されていません。');
  return getPortraitData(String(fileId));
}
