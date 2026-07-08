/** エントリポイント: 認可チェック + SPA 配信 */

/** 簡易 HTML エスケープ（& < > のみ。属性値には使わない想定） */
function escapeHtml_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function doGet() {
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  var allowed = getConfig_().allowedEmails;
  if (allowed.length > 0 && allowed.indexOf(email) < 0) {
    return HtmlService.createHtmlOutput(
      '<html><body style="padding:24px;font-family:sans-serif">' +
      '<h2>アクセス権がありません</h2>' +
      '<p>このアプリの利用には許可が必要です。管理者にお問い合わせください。</p>' +
      '<p style="color:#888">ログイン中: ' + escapeHtml_(email) + '</p></body></html>');
  }
  var t = HtmlService.createTemplateFromFile('index');
  var out = t.evaluate();
  out.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  out.setTitle('ふれあい広場 POPメーカー');
  return out;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
