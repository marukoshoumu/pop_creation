/** Script Properties 一元参照 */
function getConfig_() {
  var p = PropertiesService.getScriptProperties();
  var emails = (p.getProperty('ALLOWED_EMAILS') || '').split(',')
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(function (s) { return s !== ''; });
  return {
    apiKey: p.getProperty('GEMINI_API_KEY') || '',
    model: p.getProperty('GEMINI_MODEL') || 'gemini-2.5-flash',
    imageModel: p.getProperty('GEMINI_IMAGE_MODEL') || 'gemini-2.5-flash-image',
    spreadsheetId: p.getProperty('SPREADSHEET_ID') || '',
    driveFolderId: p.getProperty('DRIVE_FOLDER_ID') || '',
    allowedEmails: emails,
  };
}
