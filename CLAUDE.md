# ふれあい広場 POP 作成システム (hureai) — Claude / Cursor 共通ルール

## コミット対象の原則

**このリポジトリには GAS ソース・設定のみをコミットする。**

### コミットして良いもの

- `src/` 配下の GAS ソース（`.js`, `.html`, `.css`）
- `.clasp.json`, `appsscript.json`
- ルートの `README.md`, `CLAUDE.md`（本ファイル）

### コミットしてはいけないもの

| 種別 | 保管先 |
|------|--------|
| 設計・spec・モック | `$HOME/knowledge/02_Projects/hureai/docs/` |
| セッション記録 | `$HOME/knowledge/02_Projects/hureai/sessions/` |
| ステータス | `$HOME/knowledge/02_Projects/hureai/CURRENT_STATUS.md` |
| 認証情報 | Script Properties / `.env`（**コミット禁止**） |

> ordering-system と同方針。ドキュメント正本はナレッジ。  
> 参照: [KB_AI_Claude_Cursor_Agent_他プロジェクト再利用_260416.md](file:///Users/resily0808/knowledge/02_Projects/pdca/03_Resources/learnings/KB_AI_Claude_Cursor_Agent_他プロジェクト再利用_260416.md) §2

---

## ナレッジ参照先（SSOT）

| 用途 | パス |
|------|------|
| ナレッジルート | `$HOME/knowledge/02_Projects/hureai/` |
| 起動シーケンス | 同上 `AGENT.md` |
| 設計思想 | 同上 `PROJECT_DNA.md` |
| 進捗 | 同上 `CURRENT_STATUS.md` |
| 頻出パターン | 同上 `SKILLS.md` |
| 設計書 | 同上 `docs/specs/2026-07-08-pop-system-design.md` |
| デザインモック | 同上 `docs/mockups/2026-07-08-pop-mockups.html` |

---

## デプロイ・検証

```bash
# clasp（実装フェーズ以降）
clasp push
clasp deploy
```

- GAS エディタ → デプロイを管理 → Web App 再デプロイ
- 手動検証: 設計書「手動検証」節（わさび・全粒粉サンプル）

---

## 技術スタック

- Google Apps Script + HtmlService
- Gemini API（`gemini-2.5-flash`）
- Google Spreadsheet（POP 履歴）+ Drive（PDF/画像）

---

## AI エージェント起動

セッション開始時は **必ず** ナレッジの [AGENT.md](file:///Users/resily0808/knowledge/02_Projects/hureai/AGENT.md) に従う。

---

## 汎用スキル（グローバル）

プロジェクト横断で使う Cursor / Claude スキル（パスはマシン上の `~/.cursor/skills/` 等）:

| スキル | 用途 |
|--------|------|
| `knowledge-update` | ナレッジ更新 + ki |
| `brainstorming` | 要件・設計の対話 |
| `writing-plans` | 実装計画 |
| `human-clarity-doc` | 顧客向け HTML 資料 |
| `handover` | セッション引き継ぎ |

詳細: 共通 KB §4 — [KB_AI_Claude_Cursor_Agent_他プロジェクト再利用_260416.md](file:///Users/resily0808/knowledge/02_Projects/pdca/03_Resources/learnings/KB_AI_Claude_Cursor_Agent_他プロジェクト再利用_260416.md)

---

## 不変ルール（要約）

1. **価格・商品名は HTML 印字** — AI 画像生成で文字を描かない
2. **確認画面を経由** — 初期フェーズは必須
3. **ナレッジ更新** — セッション成果は `$HOME/knowledge/02_Projects/hureai/` へ
