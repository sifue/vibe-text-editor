import { EditCommand } from './EditCommand';
import { TextBufferManager } from '../editor/TextBuffer';
import { CursorPosition } from '../editor/Cursor';

export class InsertTextCommand implements EditCommand {
  private executed = false;

  constructor(
    private buffer: TextBufferManager,
    private position: CursorPosition,
    private text: string
  ) {}

  execute(): void {
    if (this.executed) return;
    this.buffer.insertText(this.position, this.text);
    this.executed = true;
  }

  undo(): void {
    if (!this.executed) return;
    this.buffer.deleteText(this.position, this.text.length);
    this.executed = false;
  }

  redo(): void {
    this.execute();
  }

  canMerge(other: EditCommand): boolean {
    if (!(other instanceof InsertTextCommand)) return false;
    
    // 同じ位置での連続的な文字入力のみマージ
    const nextPosition = { 
      row: this.position.row, 
      col: this.position.col + this.text.length 
    };
    
    return (
      other.position.row === nextPosition.row &&
      other.position.col === nextPosition.col &&
      this.text.length === 1 && // 単一文字の入力のみマージ
      other.text.length === 1 &&
      other.text !== '\n' && // 改行は別コマンドとして扱う
      this.text !== '\n'
    );
  }

  merge(other: EditCommand): void {
    if (!(other instanceof InsertTextCommand) || !this.canMerge(other)) {
      return;
    }
    
    this.text += other.text;
  }

  getCursorPosition(): CursorPosition {
    return { 
      row: this.position.row, 
      col: this.position.col, 
      displayCol: this.position.displayCol || 0 
    };
  }

  getType(): string {
    return 'insert';
  }
}