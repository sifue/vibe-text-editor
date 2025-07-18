import { CursorPosition } from '../editor/Cursor';

// 編集コマンドの基底インターフェース
export interface EditCommand {
  execute(): void;
  undo(): void;
  redo(): void;
  canMerge(other: EditCommand): boolean;
  merge(other: EditCommand): void;
  getCursorPosition(): CursorPosition;
  getType(): string;
}

// アンドゥ・リドゥ管理クラス
export class UndoRedoManager {
  private undoStack: EditCommand[] = [];
  private redoStack: EditCommand[] = [];
  private maxUndoLevels: number = 1000;
  private mergeTimeoutMs: number = 1000; // 1秒以内の連続操作をマージ
  private lastCommandTime: number = 0;

  executeCommand(command: EditCommand): void {
    command.execute();
    this.addToUndoStack(command);
    this.redoStack = []; // 新しい操作でリドゥスタックをクリア
  }

  undo(): CursorPosition | null {
    if (this.undoStack.length === 0) return null;
    const command = this.undoStack.pop()!;
    command.undo();
    this.redoStack.push(command);
    return command.getCursorPosition();
  }

  redo(): CursorPosition | null {
    if (this.redoStack.length === 0) return null;
    const command = this.redoStack.pop()!;
    command.redo();
    this.undoStack.push(command);
    
    // リドゥの場合、コマンド実行後のカーソル位置を計算
    const position = command.getCursorPosition();
    if (command.getType() === 'insert') {
      return { row: position.row, col: position.col + 1, displayCol: position.displayCol + 1 };
    }
    return position;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  private addToUndoStack(command: EditCommand): void {
    const now = Date.now();
    const timeDiff = now - this.lastCommandTime;
    
    // 連続する同種の操作を統合（時間制限内）
    if (this.undoStack.length > 0 && timeDiff < this.mergeTimeoutMs) {
      const lastCommand = this.undoStack[this.undoStack.length - 1];
      if (lastCommand && lastCommand.canMerge(command)) {
        lastCommand.merge(command);
        this.lastCommandTime = now;
        return;
      }
    }

    this.undoStack.push(command);
    this.lastCommandTime = now;

    // スタックサイズ制限
    if (this.undoStack.length > this.maxUndoLevels) {
      this.undoStack.shift();
    }
  }

  // デバッグ用メソッド
  getDebugInfo(): { undoCount: number; redoCount: number; lastCommandType: string | null } {
    return {
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommandType: this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1]?.getType() || null : null
    };
  }
}