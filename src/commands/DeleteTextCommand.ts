import { EditCommand } from './EditCommand';
import { TextBufferManager } from '../editor/TextBuffer';
import { CursorPosition } from '../editor/Cursor';

export class DeleteTextCommand implements EditCommand {
  private executed = false;

  constructor(
    private buffer: TextBufferManager,
    private position: CursorPosition,
    private deletedText: string
  ) {}

  execute(): void {
    if (this.executed) return;
    // 削除対象のテキストを取得してから削除
    const textToDelete = this.buffer.getText(this.position, this.deletedText.length);
    if (textToDelete === this.deletedText) {
      this.buffer.deleteText(this.position, this.deletedText.length);
      this.executed = true;
    }
  }

  undo(): void {
    if (!this.executed) return;
    this.buffer.insertText(this.position, this.deletedText);
    this.executed = false;
  }

  redo(): void {
    this.execute();
  }

  canMerge(other: EditCommand): boolean {
    if (!(other instanceof DeleteTextCommand)) return false;
    
    // Backspaceの場合: 現在位置の前の文字を削除
    const isBackspace = other.position.row === this.position.row && 
                       other.position.col === this.position.col - 1;
    
    // Deleteの場合: 現在位置の文字を削除
    const isDelete = other.position.row === this.position.row && 
                    other.position.col === this.position.col;
    
    return (
      (isBackspace || isDelete) &&
      this.deletedText.length === 1 && // 単一文字の削除のみマージ
      other.deletedText.length === 1 &&
      other.deletedText !== '\n' && // 改行は別コマンドとして扱う
      this.deletedText !== '\n'
    );
  }

  merge(other: EditCommand): void {
    if (!(other instanceof DeleteTextCommand) || !this.canMerge(other)) {
      return;
    }
    
    // Backspaceの場合は削除テキストを前に追加
    if (other.position.col === this.position.col - 1) {
      this.deletedText = other.deletedText + this.deletedText;
      this.position = other.position;
    }
    // Deleteの場合は削除テキストを後に追加
    else {
      this.deletedText += other.deletedText;
    }
  }

  getCursorPosition(): CursorPosition {
    return { ...this.position };
  }

  getType(): string {
    return 'delete';
  }
}