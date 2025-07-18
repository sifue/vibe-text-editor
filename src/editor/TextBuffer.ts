import { CursorPosition } from './Cursor';

// テキストバッファのインターフェース
export interface TextBuffer {
  lines: string[];
  totalLines: number;
  maxLineLength: number;
  modified: boolean;
}

// テキストバッファ管理クラス
export class TextBufferManager implements TextBuffer {
  lines: string[] = [];
  totalLines: number = 0;
  maxLineLength: number = 0;
  modified: boolean = false;

  constructor(content: string = '') {
    this.loadContent(content);
  }

  // コンテンツを読み込み
  loadContent(content: string): void {
    this.lines = content.split('\n');
    this.totalLines = this.lines.length;
    this.updateMaxLineLength();
    this.modified = false;
  }

  // 最大行長を更新（軽量化版）
  private updateMaxLineLength(): void {
    // 遅延実行フラグを設定
    this.maxLineLength = 0;
    
    // 小さなファイルは即座に計算
    if (this.lines.length <= 100) {
      this.maxLineLength = Math.max(...this.lines.map(line => line.length));
    } else {
      // 大きなファイルは最初の100行のみをチェック
      const sampleLines = this.lines.slice(0, 100);
      this.maxLineLength = Math.max(...sampleLines.map(line => line.length));
    }
  }

  // 指定位置にテキストを挿入
  insertText(position: CursorPosition, text: string): void {
    if (position.row >= this.lines.length) {
      // 行が足りない場合は空行を追加
      while (this.lines.length <= position.row) {
        this.lines.push('');
      }
    }

    const line = this.lines[position.row] || '';
    const lineChars = [...line]; // Unicode文字を正確に分割
    const col = Math.min(position.col, lineChars.length);

    if (text === '\n') {
      // 改行の場合
      const leftPart = lineChars.slice(0, col).join('');
      const rightPart = lineChars.slice(col).join('');
      this.lines[position.row] = leftPart;
      this.lines.splice(position.row + 1, 0, rightPart);
    } else {
      // 通常のテキスト挿入
      const leftPart = lineChars.slice(0, col).join('');
      const rightPart = lineChars.slice(col).join('');
      const newLine = leftPart + text + rightPart;
      this.lines[position.row] = newLine;
    }

    this.totalLines = this.lines.length;
    this.updateMaxLineLength();
    this.modified = true;
  }

  // 指定位置からテキストを削除
  deleteText(position: CursorPosition, length: number): void {
    if (position.row >= this.lines.length) return;

    const line = this.lines[position.row] || '';
    const lineChars = [...line]; // Unicode文字を正確に分割
    const col = Math.min(position.col, lineChars.length);

    if (length === 1 && col < lineChars.length) {
      // 単一文字の削除
      const leftPart = lineChars.slice(0, col).join('');
      const rightPart = lineChars.slice(col + 1).join('');
      const newLine = leftPart + rightPart;
      this.lines[position.row] = newLine;
    } else if (length === 1 && col === lineChars.length && position.row < this.lines.length - 1) {
      // 行末での削除（次の行と結合）
      const nextLine = this.lines[position.row + 1] || '';
      this.lines[position.row] = line + nextLine;
      this.lines.splice(position.row + 1, 1);
    } else {
      // 複数文字の削除
      const leftPart = lineChars.slice(0, col).join('');
      const rightPart = lineChars.slice(col + length).join('');
      const newLine = leftPart + rightPart;
      this.lines[position.row] = newLine;
    }

    this.totalLines = this.lines.length;
    this.updateMaxLineLength();
    this.modified = true;
  }

  // 指定位置からテキストを取得
  getText(position: CursorPosition, length: number): string {
    if (position.row >= this.lines.length) return '';

    const line = this.lines[position.row] || '';
    const lineChars = [...line]; // Unicode文字を正確に分割
    const col = Math.min(position.col, lineChars.length);

    if (length === 1 && col < lineChars.length) {
      return lineChars[col] || '';
    } else if (length === 1 && col === lineChars.length && position.row < this.lines.length - 1) {
      return '\n';
    } else {
      return lineChars.slice(col, col + length).join('');
    }
  }

  // 指定行を取得
  getLine(row: number): string {
    return this.lines[row] || '';
  }

  // 全コンテンツを取得
  getContent(): string {
    return this.lines.join('\n');
  }

  // 行数を取得
  getLineCount(): number {
    return this.totalLines;
  }

  // 指定行の長さを取得
  getLineLength(row: number): number {
    const line = this.getLine(row);
    return [...line].length; // Unicode文字数を正確に計算
  }

  // 変更状態をリセット
  resetModified(): void {
    this.modified = false;
  }

  // 変更状態を確認
  isModified(): boolean {
    return this.modified;
  }
}