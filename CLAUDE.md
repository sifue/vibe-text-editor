# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 言語設定 (Language Configuration)

このプロジェクトは日本語環境での動作を前提としています。

- **コミュニケーション**: 日本語で対応してください
- **コメント**: コードコメントは日本語で記述
- **ドキュメント**: 技術文書は日本語で作成
- **エラーメッセージ**: 可能な限り日本語で表示
- **変数名・関数名**: 英語を使用（国際的な慣例に従う）

## プロジェクトの概要
コンソールエディタの開発を行うプロジェクトです。
コンソールエディタとは、テキストベースのユーザーインターフェースを持つエディタで、コマンドラインで起動することができ、コマンドライン上で編集することができるエディタのことです。

## 技術概要
- Node.js v22.16.0
- TypeScript v5.8.3
- blessed
- blessed-contrib
- commander
- chalk
- iconv-lite

必要に応じて、コンソール上の入力、およびビジュアライズを行うためのライブラリをインストールしてもよいです。
できる限り最新版を使用してください。しかし、LLMモデルのカットオフと知識の関係で低いバージョンの方が実装精度が上がりそうな場合には低いバージョンを利用しても問題ありません。

## コマンド

以下のコマンドでファイルを開いて表示することができる
```bash
npx cedit [options] [file]
```

## 機能一覧
- テキストファイルを開くことができる (文字コードの対応はUTF-8/asciiのみとする)
- テキストファイルを改行区切りせずにコンソール上に表示することができる
- テキストファイルを縦スクロールすることができる
- テキストファイルを横スクロールすることができる
- テキストファイルにカーソルを表示することができる (カーソルは文字の上に表示される)
- テキストをカーソルの後に挿入することができる
- Backspaceキーでカーソルの前の文字を削除することができる
- Deleteキーでカーソルの後の文字を削除することができる
- Enterキーでカーソルの後に改行を挿入することができる
- 矢印キーでカーソルを移動することができる
- Ctrl+Sでファイルを保存することができる
- Ctrl+Cでプログラムを終了することができる
- Ctrl+Zで戻る(アンドゥ)ことができる 
- Ctrl+Yでやり直す(リドゥ)ことができる (元に戻したものをさらに戻せる)

## 非機能要件
- 大量のテキスト(数10MBのテキストファイル)を扱うことができる、そのためのデータ構造を持つ
  - 必要に応じてそのデータ構造の設計を提案してください
- 使い方のREADME.mdを作成すること
- Gitでの管理をするために、.gitignoreを作成すること

## 以下のCommandパターンによる実装方針をする

```typescript
// 編集コマンドの基底インターフェース
  interface EditCommand {
    execute(): void;
    undo(): void;
    redo(): void;
    canMerge(other: EditCommand): boolean;
    merge(other: EditCommand): void;
  }

  // 具体的なコマンド実装
  class InsertTextCommand implements EditCommand {
    constructor(
      private buffer: TextBuffer,
      private position: CursorPosition,
      private text: string
    ) {}

    execute(): void { /* テキスト挿入 */ }
    undo(): void { /* テキスト削除 */ }
    redo(): void { /* 再挿入 */ }
    canMerge(other: EditCommand): boolean { /* 連続入力の判定 */ }
    merge(other: EditCommand): void { /* コマンドの統合 */ }
  }

  class DeleteTextCommand implements EditCommand {
    constructor(
      private buffer: TextBuffer,
      private position: CursorPosition,
      private deletedText: string
    ) {}

    execute(): void { /* テキスト削除 */ }
    undo(): void { /* テキスト復元 */ }
    redo(): void { /* 再削除 */ }
    canMerge(other: EditCommand): boolean { /* 連続削除の判定 */ }
    merge(other: EditCommand): void { /* コマンドの統合 */ }
  }

  // アンドゥ・リドゥ管理
  class UndoRedoManager {
    private undoStack: EditCommand[] = [];
    private redoStack: EditCommand[] = [];
    private maxUndoLevels: number = 1000;

    executeCommand(command: EditCommand): void {
      command.execute();
      this.addToUndoStack(command);
      this.redoStack = []; // 新しい操作でリドゥスタックをクリア
    }

    undo(): boolean {
      if (this.undoStack.length === 0) return false;
      const command = this.undoStack.pop()!;
      command.undo();
      this.redoStack.push(command);
      return true;
    }

    redo(): boolean {
      if (this.redoStack.length === 0) return false;
      const command = this.redoStack.pop()!;
      command.redo();
      this.undoStack.push(command);
      return true;
    }

    private addToUndoStack(command: EditCommand): void {
      // 連続する同種の操作を統合
      if (this.undoStack.length > 0) {
        const lastCommand = this.undoStack[this.undoStack.length - 1];
        if (lastCommand.canMerge(command)) {
          lastCommand.merge(command);
          return;
        }
      }

      this.undoStack.push(command);

      // スタックサイズ制限
      if (this.undoStack.length > this.maxUndoLevels) {
        this.undoStack.shift();
      }
    }
  }
  ```

## 既存の不具合
- マルチバイトの時にカーソルの移動で編集位置などがずれる
