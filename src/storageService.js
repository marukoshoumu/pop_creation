/** Spreadsheet（POP履歴・設定）と Drive（PNG）の永続化 */

var HISTORY_SHEET = 'POP履歴';
var SETTINGS_SHEET = '設定';
var HISTORY_HEADERS = ['ID', '作成日時', '更新日時', '種別', 'サイズ', '商品名', '内容JSON', 'PNGファイルID', '作成者', '状態'];

function getSpreadsheet_() {
  return SpreadsheetApp.openById(getConfig_().spreadsheetId);
}

function ensureSheets_() {
  var ss = getSpreadsheet_();
  var h = ss.getSheetByName(HISTORY_SHEET);
  if (!h) {
    h = ss.insertSheet(HISTORY_SHEET);
    h.getRange(1, 1, 1, HISTORY_HEADERS.length).setValues([HISTORY_HEADERS]);
  }
  if (!ss.getSheetByName(SETTINGS_SHEET)) {
    var s = ss.insertSheet(SETTINGS_SHEET);
    s.getRange(1, 1, 2, 2).setValues([['キー', '値'], ['プロンプト追加指示', '']]);
  }
  return h;
}

function nextPopId_(sheet) {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMdd');
  var prefix = 'POP-' + today + '-';
  var ids = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); })
    : [];
  var max = 0;
  ids.forEach(function (id) {
    if (id.indexOf(prefix) === 0) max = Math.max(max, Number(id.slice(prefix.length)) || 0);
  });
  return prefix + ('00' + (max + 1)).slice(-3);
}

function savePop(record) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = ensureSheets_();
    var id = nextPopId_(sheet);
    var now = new Date();
    sheet.appendRow([
      id, now, now, record.種別, record.サイズ, record.商品名,
      record.内容JSON, record.PNGファイルID || '', Session.getActiveUser().getEmail(), '作成済',
    ]);
    return id;
  } finally {
    lock.releaseLock();
  }
}

function listPops(limit) {
  var sheet = ensureSheets_();
  var last = sheet.getLastRow();
  if (last <= 1) return [];
  var rows = sheet.getRange(2, 1, last - 1, HISTORY_HEADERS.length).getValues();
  return rows.reverse().slice(0, limit || 50).map(function (r) {
    return {
      ID: r[0],
      作成日時: Utilities.formatDate(new Date(r[1]), 'Asia/Tokyo', 'M月d日'),
      種別: r[3], サイズ: r[4], 商品名: r[5], 内容JSON: r[6],
      PNGファイルID: r[7],
    };
  });
}

function getPop(id) {
  return listPops(10000).filter(function (p) { return p.ID === id; })[0] || null;
}

function saveThumbnail(popId, base64Png) {
  var folder = DriveApp.getFolderById(getConfig_().driveFolderId);
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Png), 'image/png', popId + '.png');
  return folder.createFile(blob).getId();
}

/* ===== 生産者マスタ（顔イラストの使い回し） ===== */
var PRODUCERS_SHEET = '生産者マスタ';
var PRODUCERS_HEADERS = ['ID', '名前', 'イラストFileID', 'タッチ', '作成日時'];

function ensureProducersSheet_() {
  var ss = getSpreadsheet_();
  var s = ss.getSheetByName(PRODUCERS_SHEET);
  if (!s) {
    s = ss.insertSheet(PRODUCERS_SHEET);
    s.getRange(1, 1, 1, PRODUCERS_HEADERS.length).setValues([PRODUCERS_HEADERS]);
  }
  return s;
}

function listProducers() {
  var s = ensureProducersSheet_();
  var last = s.getLastRow();
  if (last <= 1) return [];
  return s.getRange(2, 1, last - 1, PRODUCERS_HEADERS.length).getValues()
    .map(function (r) { return { ID: String(r[0]), 名前: String(r[1]), イラストFileID: String(r[2]), タッチ: String(r[3]) }; })
    .filter(function (p) { return p.名前 && p.イラストFileID; });
}

/**
 * イラストPNGを Drive に保存してマスタ行を追加。写真そのものは保存しない。
 * 同名の生産者がすでにいる場合は行を上書きし、古いイラストはゴミ箱へ（作り直しを簡単に）
 */
function saveProducer(rec) {
  var folder = DriveApp.getFolderById(getConfig_().driveFolderId);
  var bytes = Utilities.base64Decode(rec.base64);
  var blob = Utilities.newBlob(bytes, rec.mimeType || 'image/png', 'producer-' + rec.名前 + '.png');
  var fileId = folder.createFile(blob).getId();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var s = ensureProducersSheet_();
    var last = s.getLastRow();
    if (last > 1) {
      var rows = s.getRange(2, 1, last - 1, PRODUCERS_HEADERS.length).getValues();
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][1]) === rec.名前) {  // 同名は上書き
          var oldFileId = String(rows[i][2]);
          s.getRange(i + 2, 3, 1, 3).setValues([[fileId, rec.タッチ || 'suisai', new Date()]]);
          if (oldFileId) {
            try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (e3) { Logger.log('旧イラスト削除失敗: ' + e3.message); }
          }
          return { ID: String(rows[i][0]), イラストFileID: fileId };
        }
      }
    }
    var id = 'PRD-' + Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyyMMddHHmmss');
    s.appendRow([id, rec.名前, fileId, rec.タッチ || 'suisai', new Date()]);
    return { ID: id, イラストFileID: fileId };
  } catch (e) {
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch (e2) { Logger.log('孤児イラスト削除失敗: ' + e2.message); }
    throw e;
  } finally {
    lock.releaseLock();
  }
}

/** イラストを base64 で返す（POP描画用）。アプリのDriveフォルダ内のファイルのみ許可 */
function getPortraitData(fileId) {
  var file = DriveApp.getFileById(fileId);
  var inFolder = false;
  var parents = file.getParents();
  while (parents.hasNext()) {
    if (parents.next().getId() === getConfig_().driveFolderId) { inFolder = true; break; }
  }
  if (!inFolder) throw new Error('このイラストは読み込めません。');
  var blob = file.getBlob();
  return { mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
}

function getSettings() {
  var ss = getSpreadsheet_();
  var s = ss.getSheetByName(SETTINGS_SHEET);
  if (!s || s.getLastRow() <= 1) return {};
  var out = {};
  s.getRange(2, 1, s.getLastRow() - 1, 2).getValues().forEach(function (r) {
    if (r[0]) out[String(r[0])] = String(r[1]);
  });
  return out;
}

/** GAS エディタから手動実行するスモークテスト */
function smokeStorage() {
  var id = savePop({ 種別: '商品型', サイズ: '棚札', 商品名: 'スモークテスト', 内容JSON: '{}', PNGファイルID: '' });
  Logger.log('saved: ' + id);
  Logger.log('list: ' + JSON.stringify(listPops(3)));
  Logger.log('settings: ' + JSON.stringify(getSettings()));
}
