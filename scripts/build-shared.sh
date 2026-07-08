#!/bin/bash
# shared/*.js を GAS クライアント用 <script> ラップ HTML に変換して src/ へ配置
# 例: shared/popTemplates.js → src/popTemplatesJs.html
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
for f in "$ROOT"/shared/*.js; do
  [ -e "$f" ] || continue
  name="$(basename "$f" .js)"
  out="$ROOT/src/${name}Js.html"
  {
    echo "<script>"
    echo "// 自動生成: shared/${name}.js から build-shared.sh が生成。直接編集しない"
    cat "$f"
    echo "</script>"
  } > "$out"
  echo "generated: src/${name}Js.html"
done
