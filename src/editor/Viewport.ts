import { CursorPosition } from './Cursor';
import { TextBufferManager } from './TextBuffer';
import { TextUtils } from '../utils/TextUtils';

// ビューポート（表示領域）のインターフェース
export interface ViewportInfo {
  startRow: number;    // 表示開始行
  startCol: number;    // 表示開始列
  height: number;      // 表示可能行数
  width: number;       // 表示可能文字数
}

// ビューポート管理クラス
export class Viewport {
  private startRow: number = 0;
  private startCol: number = 0;
  private height: number = 0;
  private width: number = 0;

  constructor(height: number, width: number) {
    this.height = height;
    this.width = width;
  }

  // ビューポートサイズを設定
  setSize(height: number, width: number): void {
    this.height = height;
    this.width = width;
  }

  // ビューポート情報を取得
  getInfo(): ViewportInfo {
    return {
      startRow: this.startRow,
      startCol: this.startCol,
      height: this.height,
      width: this.width
    };
  }

  // 縦スクロール
  scrollUp(): void {
    if (this.startRow > 0) {
      this.startRow--;
    }
  }

  scrollDown(maxRows: number): void {
    if (this.startRow < maxRows - 1) {
      this.startRow++;
    }
  }

  // 横スクロール
  scrollLeft(): void {
    if (this.startCol > 0) {
      this.startCol--;
    }
  }

  scrollRight(maxCols: number): void {
    if (this.startCol < maxCols - 1) {
      this.startCol++;
    }
  }

  // カーソルが表示領域内に収まるようにスクロール
  ensureCursorVisible(cursorPosition: CursorPosition, buffer: TextBufferManager): void {
    const { row, displayCol } = cursorPosition;

    // 垂直スクロール調整
    if (row < this.startRow) {
      // カーソルが上にはみ出した場合
      this.startRow = row;
    } else if (row >= this.startRow + this.height) {
      // カーソルが下にはみ出した場合
      this.startRow = row - this.height + 1;
    }

    // 水平スクロール調整（表示幅ベース）
    if (displayCol < this.startCol) {
      // カーソルが左にはみ出した場合
      this.startCol = displayCol;
    } else if (displayCol >= this.startCol + this.width) {
      // カーソルが右にはみ出した場合
      this.startCol = displayCol - this.width + 1;
    }

    // 範囲制限
    this.startRow = Math.max(0, this.startRow);
    this.startCol = Math.max(0, this.startCol);
    this.startRow = Math.min(this.startRow, Math.max(0, buffer.getLineCount() - this.height));
  }

  // 指定された範囲の行を取得（マルチバイト対応）
  getVisibleLines(buffer: TextBufferManager): string[] {
    const visibleLines: string[] = [];
    const endRow = Math.min(this.startRow + this.height, buffer.getLineCount());

    for (let row = this.startRow; row < endRow; row++) {
      const line = buffer.getLine(row);
      
      // 表示幅に基づいて部分文字列を取得
      const startCharIndex = TextUtils.getCharIndexFromDisplayWidth(line, this.startCol);
      const endCharIndex = TextUtils.getCharIndexFromDisplayWidth(line, this.startCol + this.width);
      
      const visiblePart = line.substring(startCharIndex, endCharIndex);
      visibleLines.push(visiblePart);
    }

    // 空行で埋める
    while (visibleLines.length < this.height) {
      visibleLines.push('');
    }

    return visibleLines;
  }

  // 画面座標を絶対座標に変換
  screenToBufferPosition(screenRow: number, screenCol: number, buffer: TextBufferManager): CursorPosition {
    const row = this.startRow + screenRow;
    const line = buffer.getLine(row);
    const displayCol = this.startCol + screenCol;
    const col = TextUtils.getCharIndexFromDisplayWidth(line, displayCol);
    
    return {
      row,
      col,
      displayCol
    };
  }

  // 絶対座標を画面座標に変換
  bufferToScreenPosition(bufferPosition: CursorPosition): { row: number; col: number } {
    return {
      row: bufferPosition.row - this.startRow,
      col: bufferPosition.displayCol - this.startCol
    };
  }

  // 現在のスクロール位置を取得
  getScrollPosition(): { row: number; col: number } {
    return {
      row: this.startRow,
      col: this.startCol
    };
  }
}