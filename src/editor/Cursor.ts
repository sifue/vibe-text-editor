// カーソル位置を表すインターフェース
export interface CursorPosition {
  row: number;        // 行番号（0ベース）
  col: number;        // 文字インデックス（0ベース）
  displayCol: number; // 表示位置（0ベース、マルチバイト対応）
}

import { TextUtils } from '../utils/TextUtils';

// カーソル管理クラス
export class Cursor {
  private position: CursorPosition;

  constructor(row: number = 0, col: number = 0) {
    this.position = { row, col, displayCol: 0 };
  }

  getPosition(): CursorPosition {
    return { ...this.position };
  }

  setPosition(row: number, col: number, displayCol?: number): void {
    this.position = { row, col, displayCol: displayCol || 0 };
  }

  // 文字列を基に正確なカーソル位置を設定
  setPositionWithLine(row: number, col: number, line: string): void {
    const displayCol = TextUtils.getDisplayWidthFromCharIndex(line, col);
    this.position = { row, col, displayCol };
  }

  moveUp(): void {
    if (this.position.row > 0) {
      this.position.row--;
    }
  }

  moveDown(): void {
    this.position.row++;
  }

  moveLeft(line?: string): void {
    if (this.position.col > 0) {
      this.position.col--;
      if (line) {
        this.position.displayCol = TextUtils.getDisplayWidthFromCharIndex(line, this.position.col);
      }
    }
  }

  moveRight(line?: string): void {
    this.position.col++;
    if (line) {
      this.position.displayCol = TextUtils.getDisplayWidthFromCharIndex(line, this.position.col);
    }
  }

  moveToLineStart(): void {
    this.position.col = 0;
    this.position.displayCol = 0;
  }

  moveToLineEnd(lineLength: number, line?: string): void {
    this.position.col = lineLength;
    if (line) {
      this.position.displayCol = TextUtils.getStringWidth(line);
    }
  }

  // 指定された位置にカーソルを移動
  moveTo(position: CursorPosition): void {
    this.position = { ...position };
  }

  // 行の範囲内にカーソルを制限
  constrainToLine(lineLength: number, line?: string): void {
    if (this.position.col > lineLength) {
      this.position.col = lineLength;
      if (line) {
        this.position.displayCol = TextUtils.getStringWidth(line);
      }
    }
  }

  // 指定された行数の範囲内にカーソルを制限
  constrainToBuffer(maxRows: number): void {
    if (this.position.row >= maxRows) {
      this.position.row = Math.max(0, maxRows - 1);
    }
    if (this.position.row < 0) {
      this.position.row = 0;
    }
  }
}