# ふれあい広場 POP 作成システム — コードワークスペース

GAS 実装用リポジトリ（将来）。**ドキュメントの正本はナレッジ側。**

## ナレッジ（正本）

```
/Users/resily0808/knowledge/02_Projects/hureai/
```

| 参照 | 内容 |
|------|------|
| [AGENT.md](file:///Users/resily0808/knowledge/02_Projects/hureai/AGENT.md) | AI 起動シーケンス |
| [SKILLS.md](file:///Users/resily0808/knowledge/02_Projects/hureai/SKILLS.md) | 頻出パターン |
| [CLAUDE.md](./CLAUDE.md) | 本リポジトリのコミット・運用ルール |
| [CURRENT_STATUS.md](file:///Users/resily0808/knowledge/02_Projects/hureai/CURRENT_STATUS.md) | 最新ステータス |
| [設計書](file:///Users/resily0808/knowledge/02_Projects/hureai/docs/specs/2026-07-08-pop-system-design.md) | 確定設計方向 |
| [デザインモック](file:///Users/resily0808/knowledge/02_Projects/hureai/docs/mockups/2026-07-08-pop-mockups.html) | UI/デザイン |
| [INDEX.md](file:///Users/resily0808/knowledge/02_Projects/hureai/INDEX.md) | ナレッジマップ |
| [共通 KB](file:///Users/resily0808/knowledge/02_Projects/pdca/03_Resources/learnings/KB_AI_Claude_Cursor_Agent_他プロジェクト再利用_260416.md) | CLAUDE/AGENT/Skills 流用 |

## このディレクトリ

- `src/`（clasp・GAS 実装）、`shared/`（クライアント/サーバー共有ロジックの原本）、`tests/`（自動テスト）、`.clasp.json` を配置済み。

## セットアップ・デプロイ手順

### 前提

- Node.js（`npm install` 済み）
- `clasp`（`npx clasp login` で Google アカウント認証済み）

### 事前準備

1. 新規 Google Spreadsheet を1つ作成し、URL または ID を控える（履歴保存専用。受注システムとは別ファイル）。
2. Google Drive にフォルダ「ふれあい広場_POP」を作成し、フォルダ ID を控える（PNG サムネイル保存用）。
3. Google AI Studio で Gemini API キーを取得する。

### Script Properties 設定

GAS エディタ → プロジェクトの設定 → スクリプト プロパティ に以下を設定する。

| キー | 値 | 備考 |
|------|----|----|
| `GEMINI_API_KEY` | Google AI Studio で取得した API キー | 必須 |
| `GEMINI_MODEL` | `gemini-2.5-flash` | 必須 |
| `SPREADSHEET_ID` | 事前準備1で作成した Spreadsheet の ID | 必須 |
| `DRIVE_FOLDER_ID` | 事前準備2で作成した Drive フォルダの ID | 必須 |
| `ALLOWED_EMAILS` | 利用を許可する社員の Google アカウントをカンマ区切りで指定（例: `a@example.com,b@example.com`） | **空の場合は全ログインユーザーを許可**するため、本番運用では必ず設定すること |

### デプロイ

```bash
npm run push          # build（shared → src の HTML ラップ生成）+ clasp push
npx clasp deploy       # 新規デプロイを作成
```

続けて GAS エディタ →「デプロイを管理」→ 対象のウェブアプリのデプロイ設定を開き、アクセスできるユーザーを確認する。

> **重要:** アクセス設定は必ず「**全員（Google ログイン必須）**」にすること。
> 「**全員（匿名を含む）= ANYONE_ANONYMOUS**」には**絶対にしない**。匿名アクセスでは `Session.getActiveUser().getEmail()` が空文字になり、`ALLOWED_EMAILS` を未設定にした場合に誰でもアクセスできてしまう。

### スモークテスト（デプロイ直後にGASエディタで実行）

1. `smokeStorage()` を実行 → スプレッドシートに「POP履歴」「設定」の2シートが自動作成されることを確認する。
2. `smokeGemini()` を実行 → 実行ログに抽出結果（fields）とキャッチコピー3案が出力されることを確認する。

### 開発時の注意（build について）

- `npm run push` は `scripts/build-shared.sh` によるビルド（`shared/` 配下の共有ロジックを `src/*Js.html` の `<script>` ラップ形式に変換）を含む。
- **`shared/popTemplates.js` を直接編集すること。`src/popTemplatesJs.html` は自動生成物であり、直接編集しても次回ビルドで上書きされる。**
- `npx clasp push -f` を単独で実行するとビルド結果を反映しないままの `src/` を push してしまうため、コード変更後は必ず `npm run push` を使うこと（`shared/` を変更していない軽微な `src/` 直接修正のみの場合を除く）。

## ナレッジ更新

変更後は `$HOME/knowledge/02_Projects/hureai/docs/guides/ナレッジ更新手順.md` に従い、  
`bash ~/knowledge/03_Resources/scripts/update-index.sh` を実行。

## 関連

- 馬場園芸受注 GAS: `/Users/resily0808/Downloads/temp/baba/ordering_System_For_Farmers_By_Gas/`
