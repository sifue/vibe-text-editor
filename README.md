# Vibe Text Editor

コンソールで動作するテキストエディタです。アンドゥ・リドゥ機能、大容量ファイル対応、直感的な操作を提供します。

## 特徴

- **アンドゥ・リドゥ機能**: Ctrl+Z で元に戻す、Ctrl+Y でやり直しが可能
- **大容量ファイル対応**: 数10MBのファイルも効率的に編集可能
- **直感的な操作**: 矢印キーによるカーソル移動、一般的なショートカットキー
- **UTF-8/ASCII対応**: 日本語テキストも正しく表示・編集

## インストール

```bash
npm install
npm run build
```

## 使い方

### 基本的な使用方法

```bash
# 新規ファイルを作成
npx cedit

# 既存ファイルを開く
npx cedit filename.txt

# 特定の行・列から開始
npx cedit -l 10 -c 5 filename.txt

# 読み取り専用モードで開く
npx cedit -r filename.txt
```

### コマンドラインオプション

- `-r, --readonly`: 読み取り専用モードで開く
- `-l, --line <number>`: 指定行にジャンプ
- `-c, --column <number>`: 指定列にジャンプ
- `-h, --help`: ヘルプを表示
- `-V, --version`: バージョンを表示

## キー操作

### カーソル移動

| キー | 動作 |
|------|------|
| ↑ | 上に移動 |
| ↓ | 下に移動 |
| ← | 左に移動 |
| → | 右に移動 |
| Home | 行の先頭に移動 |
| End | 行の末尾に移動 |
| Page Up | 1画面分上に移動 |
| Page Down | 1画面分下に移動 |

### 編集操作

| キー | 動作 |
|------|------|
| 文字キー | 文字を挿入 |
| Backspace | カーソルの前の文字を削除 |
| Delete | カーソルの位置の文字を削除 |
| Enter | 改行を挿入 |

### ファイル操作

| キー | 動作 |
|------|------|
| Ctrl+S | ファイルを保存 |
| Ctrl+C | エディタを終了 |

### アンドゥ・リドゥ

| キー | 動作 |
|------|------|
| Ctrl+Z | 元に戻す（アンドゥ） |
| Ctrl+Y | やり直し（リドゥ） |

## 技術仕様

### 使用技術

- **Node.js**: v22.16.0
- **TypeScript**: v5.8.3
- **blessed**: コンソールUI構築
- **commander**: コマンドライン引数解析
- **chalk**: テキストの色付け
- **iconv-lite**: 文字コード変換

### アーキテクチャ

エディタはCommand パターンを使用してアンドゥ・リドゥ機能を実装しています：

- **EditCommand**: 編集操作の基底インターフェース
- **UndoRedoManager**: アンドゥ・リドゥの管理
- **TextBuffer**: 効率的なテキストデータ管理
- **Viewport**: 表示範囲の管理
- **Screen**: コンソール画面の描画

### データ構造

```typescript
interface TextBuffer {
  lines: string[];           // 行データの配列
  totalLines: number;        // 総行数
  maxLineLength: number;     // 最大行長
  modified: boolean;         // 変更フラグ
}

interface CursorPosition {
  row: number;    // 行番号（0ベース）
  col: number;    // 列番号（0ベース）
}

interface Viewport {
  startRow: number;    // 表示開始行
  startCol: number;    // 表示開始列
  height: number;      // 表示可能行数
  width: number;       // 表示可能文字数
}
```

## 開発者向け

### 開発環境のセットアップ

```bash
# 依存関係のインストール
npm install

# 開発モードで実行
npm run dev src/index.ts

# ビルド
npm run build

# 型チェック
npx tsc --noEmit
```

### プロジェクト構造

```
vibe-text-editor/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── editor/
│   │   ├── Editor.ts         # メインエディタクラス
│   │   ├── TextBuffer.ts     # テキストバッファ管理
│   │   ├── Cursor.ts         # カーソル管理
│   │   └── Viewport.ts       # ビューポート管理
│   ├── commands/
│   │   ├── EditCommand.ts    # コマンドインターフェース
│   │   ├── InsertTextCommand.ts
│   │   ├── DeleteTextCommand.ts
│   │   └── InsertLineCommand.ts
│   ├── ui/
│   │   └── Screen.ts         # 画面描画
│   └── utils/
│       └── FileIO.ts         # ファイル読み書き
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## ライセンス

MIT License

## 貢献

バグ報告や機能要求は、GitHubのIssuesでお願いします。
プルリクエストも歓迎します。

## 既知の制限

- 文字コードはUTF-8とASCIIのみ対応
- バイナリファイルは非対応
- 正規表現による検索・置換は未実装
- 複数ファイルの同時編集は未対応

## 今後の予定

- [ ] 検索・置換機能
- [ ] 複数ファイルタブ
- [ ] 文字コード自動判定
- [ ] 構文ハイライト
- [ ] 行番号表示
- [ ] 折り返し表示