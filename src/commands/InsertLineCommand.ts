import { EditCommand } from './EditCommand';
import { TextBufferManager } from '../editor/TextBuffer';
import { CursorPosition } from '../editor/Cursor';

export class InsertLineCommand implements EditCommand {
  private executed = false;

  constructor(
    private buffer: TextBufferManager,
    private position: CursorPosition
  ) {}

  execute(): void {
    if (this.executed) return;
    this.buffer.insertText(this.position, '\n');
    this.executed = true;
  }

  undo(): void {
    if (!this.executed) return;
    this.buffer.deleteText(this.position, 1);
    this.executed = false;
  }

  redo(): void {
    this.execute();
  }

  canMerge(_other: EditCommand): boolean {
    // 改行コマンドはマージしない
    return false;
  }

  merge(_other: EditCommand): void {
    // 改行コマンドはマージしない
  }

  getCursorPosition(): CursorPosition {
    return { 
      row: this.position.row, 
      col: this.position.col, 
      displayCol: this.position.displayCol || 0 
    };
  }

  getType(): string {
    return 'newline';
  }
}