import { TextBufferManager } from './TextBuffer';
import { Cursor } from './Cursor';
import { Viewport } from './Viewport';
import { Screen } from '../ui/Screen';
import { FileIO } from '../utils/FileIO';
import { TextUtils } from '../utils/TextUtils';
import { UndoRedoManager } from '../commands/EditCommand';
import { InsertTextCommand } from '../commands/InsertTextCommand';
import { DeleteTextCommand } from '../commands/DeleteTextCommand';
import { InsertLineCommand } from '../commands/InsertLineCommand';
import { Debug } from '../utils/Debug';
import chalk from 'chalk';
import * as path from 'path';

// エディタオプション
interface EditorOptions {
  readonly?: boolean;
  line?: string;
  column?: string;
}

// メインエディタクラス
export class Editor {
  private buffer: TextBufferManager;
  private cursor: Cursor;
  private viewport: Viewport;
  private screen: Screen;
  private undoRedoManager: UndoRedoManager;
  private filePath: string | undefined;
  private options: EditorOptions;
  private running: boolean = false;

  constructor(content: string, filePath: string | undefined, options: EditorOptions = {}) {
    const debug = process.env['DEBUG_CEDIT'] === 'true';
    
    if (debug) {
      console.log('Editor constructor: Starting initialization');
      console.log(`Content length: ${content.length} chars`);
    }
    
    this.buffer = new TextBufferManager(content);
    if (debug) console.log('Editor constructor: Buffer created');
    
    this.cursor = new Cursor();
    if (debug) console.log('Editor constructor: Cursor created');
    
    this.viewport = new Viewport(25, 80); // 初期サイズ
    if (debug) console.log('Editor constructor: Viewport created');
    
    this.screen = new Screen();
    if (debug) console.log('Editor constructor: Screen created');
    
    this.undoRedoManager = new UndoRedoManager();
    if (debug) console.log('Editor constructor: UndoRedoManager created');
    
    this.filePath = filePath;
    this.options = options;

    // オプションに基づいてカーソル位置を設定
    this.setupInitialCursor();
    if (debug) console.log('Editor constructor: Initial cursor setup complete');
  }

  // 初期カーソル位置を設定
  private setupInitialCursor(): void {
    if (this.options.line || this.options.column) {
      const line = this.options.line ? parseInt(this.options.line) - 1 : 0;
      const column = this.options.column ? parseInt(this.options.column) - 1 : 0;
      
      this.cursor.setPosition(
        Math.max(0, Math.min(line, this.buffer.getLineCount() - 1)),
        Math.max(0, column)
      );
    }
  }

  // エディタを開始
  async start(): Promise<void> {
    try {
      const debug = process.env['DEBUG_CEDIT'] === 'true';
      
      if (debug) console.log('Editor.start: Starting editor');
      
      this.running = true;
      
      // プロセス終了処理の設定
      this.setupExitHandlers();
      if (debug) console.log('Editor.start: Exit handlers setup complete');
      
      // 画面サイズを取得してビューポートを設定
      // blessed screenの初期化を少し待つ
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const size = this.screen.getSize();
      this.viewport.setSize(size.height, size.width);
      if (debug) console.log(`Editor.start: Viewport set to ${size.width}x${size.height}`);
      
      // 画面リサイズイベントをリッスン
      this.screen.onResize((width, height) => {
        this.viewport.setSize(height, width);
        this.update();
      });
      if (debug) console.log('Editor.start: Resize handler setup complete');

      // キー入力をリッスン
      this.screen.onKey((key, ch) => {
        this.handleKeyPress(key, ch);
      });
      if (debug) console.log('Editor.start: Key handler setup complete');

      // 初期表示
      if (debug) console.log('Editor.start: Updating screen');
      this.update();
      if (debug) console.log('Editor.start: Screen update complete');

      // エディタの実行を継続
      if (debug) console.log('Editor.start: Entering event loop');
      await this.waitForExit();
      
    } catch (error) {
      console.error(chalk.red('エディタの実行中にエラーが発生しました:'), error);
    } finally {
      this.cleanup();
    }
  }

  // 画面を更新
  private update(): void {
    // カーソルが表示範囲内に収まるように調整
    this.viewport.ensureCursorVisible(this.cursor.getPosition(), this.buffer);
    
    // 画面を更新
    this.screen.update(
      this.buffer,
      this.cursor,
      this.viewport,
      this.filePath,
      this.undoRedoManager.canUndo(),
      this.undoRedoManager.canRedo()
    );
  }

  // キー入力を処理
  private handleKeyPress(key: string, ch: string): void {
    try {
      Debug.logKeyEvent(key, ch, 'Editor');
      
      if (this.options.readonly) {
        this.handleReadOnlyKeyPress(key, ch);
      } else {
        this.handleEditableKeyPress(key, ch);
      }
    } catch (error) {
      Debug.logError(error as Error, 'KeyPress');
      console.error(chalk.red('キー処理中にエラーが発生しました:'), error);
    }
  }

  // 読み取り専用モードのキー処理
  private handleReadOnlyKeyPress(key: string, _ch: string): void {
    switch (key) {
      case 'up':
        this.moveCursorUp();
        break;
      case 'down':
        this.moveCursorDown();
        break;
      case 'left':
        this.moveCursorLeft();
        break;
      case 'right':
        this.moveCursorRight();
        break;
      case 'home':
        this.moveCursorToLineStart();
        break;
      case 'end':
        this.moveCursorToLineEnd();
        break;
      case 'pageup':
        this.pageUp();
        break;
      case 'pagedown':
        this.pageDown();
        break;
      case 'C-c':
        this.quit();
        break;
    }
    
    this.update();
  }

  // 編集可能モードのキー処理
  private handleEditableKeyPress(key: string, ch: string): void {
    switch (key) {
      case 'up':
        this.moveCursorUp();
        break;
      case 'down':
        this.moveCursorDown();
        break;
      case 'left':
        this.moveCursorLeft();
        break;
      case 'right':
        this.moveCursorRight();
        break;
      case 'home':
        this.moveCursorToLineStart();
        break;
      case 'end':
        this.moveCursorToLineEnd();
        break;
      case 'pageup':
        this.pageUp();
        break;
      case 'pagedown':
        this.pageDown();
        break;
      case 'backspace':
        this.backspace();
        break;
      case 'delete':
        this.delete();
        break;
      case 'enter':
        this.insertNewline();
        break;
      case 'C-s':
        Debug.logKeyEvent('C-s', '', 'Editor-Save');
        this.save();
        break;
      case 'C-c':
        this.quit();
        break;
      case 'C-z':
        Debug.logKeyEvent('C-z', '', 'Editor-Undo');
        this.undo();
        break;
      case 'C-y':
        Debug.logKeyEvent('C-y', '', 'Editor-Redo');
        this.redo();
        break;
      default:
        if (ch && ch.length === 1 && ch.charCodeAt(0) >= 32) {
          this.insertText(ch);
        }
        break;
    }
    
    this.update();
  }

  // カーソル移動メソッド
  private moveCursorUp(): void {
    const position = this.cursor.getPosition();
    if (position.row > 0) {
      this.cursor.moveUp();
      const newRow = this.cursor.getPosition().row;
      const line = this.buffer.getLine(newRow);
      
      // 現在の表示位置を保持して、対応する文字位置を計算
      const targetDisplayCol = position.displayCol;
      const newCol = Math.min(
        TextUtils.getCharIndexFromDisplayWidth(line, targetDisplayCol),
        line.length
      );
      
      this.cursor.setPositionWithLine(newRow, newCol, line);
    }
  }

  private moveCursorDown(): void {
    const position = this.cursor.getPosition();
    if (position.row < this.buffer.getLineCount() - 1) {
      this.cursor.moveDown();
      const newRow = this.cursor.getPosition().row;
      const line = this.buffer.getLine(newRow);
      
      // 現在の表示位置を保持して、対応する文字位置を計算
      const targetDisplayCol = position.displayCol;
      const newCol = Math.min(
        TextUtils.getCharIndexFromDisplayWidth(line, targetDisplayCol),
        line.length
      );
      
      this.cursor.setPositionWithLine(newRow, newCol, line);
    }
  }

  private moveCursorLeft(): void {
    const position = this.cursor.getPosition();
    if (position.col > 0) {
      const line = this.buffer.getLine(position.row);
      this.cursor.moveLeft(line);
    } else if (position.row > 0) {
      // 前の行の末尾に移動
      this.cursor.moveUp();
      const newRow = this.cursor.getPosition().row;
      const line = this.buffer.getLine(newRow);
      this.cursor.moveToLineEnd(line.length, line);
    }
  }

  private moveCursorRight(): void {
    const position = this.cursor.getPosition();
    const line = this.buffer.getLine(position.row);
    
    if (position.col < line.length) {
      this.cursor.moveRight(line);
    } else if (position.row < this.buffer.getLineCount() - 1) {
      // 次の行の先頭に移動
      this.cursor.moveDown();
      this.cursor.moveToLineStart();
    }
  }

  private moveCursorToLineStart(): void {
    this.cursor.moveToLineStart();
  }

  private moveCursorToLineEnd(): void {
    const position = this.cursor.getPosition();
    const line = this.buffer.getLine(position.row);
    this.cursor.moveToLineEnd(line.length, line);
  }

  private pageUp(): void {
    const viewportHeight = this.viewport.getInfo().height;
    const position = this.cursor.getPosition();
    const newRow = Math.max(0, position.row - viewportHeight);
    const line = this.buffer.getLine(newRow);
    const newCol = Math.min(position.col, line.length);
    this.cursor.setPositionWithLine(newRow, newCol, line);
  }

  private pageDown(): void {
    const viewportHeight = this.viewport.getInfo().height;
    const position = this.cursor.getPosition();
    const newRow = Math.min(this.buffer.getLineCount() - 1, position.row + viewportHeight);
    const line = this.buffer.getLine(newRow);
    const newCol = Math.min(position.col, line.length);
    this.cursor.setPositionWithLine(newRow, newCol, line);
  }

  // 編集メソッド
  private insertText(text: string): void {
    try {
      const position = this.cursor.getPosition();
      Debug.logCursorPosition(position, this.buffer.getLine(position.row), 'InsertText');
      
      const command = new InsertTextCommand(this.buffer, position, text);
      this.undoRedoManager.executeCommand(command);
      
      // 挿入後のカーソル位置を正確に計算
      const updatedLine = this.buffer.getLine(position.row);
      const newCol = position.col + text.length;
      this.cursor.setPositionWithLine(position.row, newCol, updatedLine);
      
      Debug.logCursorPosition(this.cursor.getPosition(), updatedLine, 'InsertText-After');
    } catch (error) {
      Debug.logError(error as Error, 'InsertText');
      console.error(chalk.red('テキスト挿入中にエラーが発生しました:'), error);
    }
  }

  private backspace(): void {
    const position = this.cursor.getPosition();
    
    if (position.col > 0) {
      const deletePosition = { row: position.row, col: position.col - 1, displayCol: 0 };
      const deletedText = this.buffer.getText(deletePosition, 1);
      const command = new DeleteTextCommand(this.buffer, deletePosition, deletedText);
      this.undoRedoManager.executeCommand(command);
      
      // 削除後のカーソル位置を正確に計算
      const updatedLine = this.buffer.getLine(position.row);
      const newCol = position.col - 1;
      this.cursor.setPositionWithLine(position.row, newCol, updatedLine);
    } else if (position.row > 0) {
      const previousLineLength = this.buffer.getLineLength(position.row - 1);
      const deletePosition = { row: position.row - 1, col: previousLineLength, displayCol: 0 };
      const command = new DeleteTextCommand(this.buffer, deletePosition, '\n');
      this.undoRedoManager.executeCommand(command);
      
      // 前の行の末尾に移動
      const previousLine = this.buffer.getLine(position.row - 1);
      this.cursor.setPositionWithLine(position.row - 1, previousLineLength, previousLine);
    }
  }

  private delete(): void {
    const position = this.cursor.getPosition();
    const line = this.buffer.getLine(position.row);
    
    if (position.col < line.length) {
      const deletedText = this.buffer.getText(position, 1);
      const command = new DeleteTextCommand(this.buffer, position, deletedText);
      this.undoRedoManager.executeCommand(command);
      
      // 削除後はカーソル位置はそのままだが、displayColを再計算
      const updatedLine = this.buffer.getLine(position.row);
      this.cursor.setPositionWithLine(position.row, position.col, updatedLine);
    } else if (position.row < this.buffer.getLineCount() - 1) {
      const command = new DeleteTextCommand(this.buffer, position, '\n');
      this.undoRedoManager.executeCommand(command);
      
      // 改行削除後はカーソル位置はそのままだが、displayColを再計算
      const updatedLine = this.buffer.getLine(position.row);
      this.cursor.setPositionWithLine(position.row, position.col, updatedLine);
    }
  }

  private insertNewline(): void {
    const position = this.cursor.getPosition();
    const command = new InsertLineCommand(this.buffer, position);
    this.undoRedoManager.executeCommand(command);
    
    // 改行挿入後は次の行の先頭に移動
    this.cursor.setPosition(position.row + 1, 0, 0);
  }

  // アンドゥ・リドゥ
  private undo(): void {
    const debugInfo = this.undoRedoManager.getDebugInfo();
    Debug.logKeyEvent('undo', `canUndo: ${debugInfo.undoCount > 0}, stack: ${debugInfo.undoCount}`, 'Editor-Undo-Debug');
    
    const cursorPosition = this.undoRedoManager.undo();
    if (cursorPosition) {
      this.cursor.moveTo(cursorPosition);
      this.cursor.constrainToBuffer(this.buffer.getLineCount());
      
      // 行の制約を適用し、displayColを正確に計算
      const line = this.buffer.getLine(cursorPosition.row);
      if (cursorPosition.col > line.length) {
        this.cursor.setPositionWithLine(cursorPosition.row, line.length, line);
      } else {
        this.cursor.setPositionWithLine(cursorPosition.row, cursorPosition.col, line);
      }
      
      this.showStatusMessage('アンドゥしました');
    } else {
      this.showStatusMessage('アンドゥできません');
    }
  }

  // 状態メッセージを表示
  private showStatusMessage(message: string): void {
    // 画面の下部に短時間メッセージを表示
    this.screen.showStatusMessage(message);
  }

  private redo(): void {
    const debugInfo = this.undoRedoManager.getDebugInfo();
    Debug.logKeyEvent('redo', `canRedo: ${debugInfo.redoCount > 0}, stack: ${debugInfo.redoCount}`, 'Editor-Redo-Debug');
    
    const cursorPosition = this.undoRedoManager.redo();
    if (cursorPosition) {
      this.cursor.moveTo(cursorPosition);
      this.cursor.constrainToBuffer(this.buffer.getLineCount());
      
      // 行の制約を適用し、displayColを正確に計算
      const line = this.buffer.getLine(cursorPosition.row);
      if (cursorPosition.col > line.length) {
        this.cursor.setPositionWithLine(cursorPosition.row, line.length, line);
      } else {
        this.cursor.setPositionWithLine(cursorPosition.row, cursorPosition.col, line);
      }
      
      this.showStatusMessage('リドゥしました');
    } else {
      this.showStatusMessage('リドゥできません');
    }
  }

  // ファイル保存
  private async save(): Promise<void> {
    Debug.logKeyEvent('save', 'method-called', 'Editor-Save-Method');
    
    if (!this.filePath) {
      // ファイル名が指定されていない場合は状態行にメッセージを表示
      this.showStatusMessage('ファイル名が指定されていません');
      return;
    }

    try {
      Debug.startTimer('Save');
      await FileIO.writeFile(this.filePath, this.buffer.getContent());
      this.buffer.resetModified();
      Debug.endTimer('Save');
      
      // 保存完了をユーザーに知らせる（常に表示）
      this.showStatusMessage(`保存しました: ${path.basename(this.filePath)}`);
      
      // デバッグ時はより詳細な情報を表示
      if (Debug.isEnabled()) {
        console.log(chalk.green(`ファイルを保存しました: ${this.filePath}`));
      }
    } catch (error) {
      Debug.logError(error as Error, 'Save');
      this.showStatusMessage(`保存に失敗しました: ${(error as Error).message}`);
      console.error(chalk.red('保存に失敗しました:'), error);
    }
  }

  // プロセス終了処理の設定
  private setupExitHandlers(): void {
    // SIGINT (Ctrl+C) の処理
    process.on('SIGINT', () => {
      this.forceQuit();
    });
    
    // SIGTERM の処理
    process.on('SIGTERM', () => {
      this.forceQuit();
    });
    
    // 未処理例外の処理
    process.on('uncaughtException', (error) => {
      Debug.logError(error, 'UncaughtException');
      Debug.logMemoryUsage('UncaughtException');
      console.error(chalk.red('予期しないエラーが発生しました:'), error);
      this.forceQuit();
    });
    
    // 未処理のPromise拒否の処理
    process.on('unhandledRejection', (reason, _promise) => {
      Debug.logError(reason as Error, 'UnhandledRejection');
      Debug.logMemoryUsage('UnhandledRejection');
      console.error(chalk.red('未処理のPromise拒否:'), reason);
      this.forceQuit();
    });
  }

  // 通常終了
  private quit(): void {
    this.running = false;
  }

  // 強制終了
  private forceQuit(): void {
    this.cleanup();
    process.exit(0);
  }

  // クリーンアップ処理
  private cleanup(): void {
    try {
      if (this.screen) {
        this.screen.destroy();
      }
    } catch (error) {
      // クリーンアップ中のエラーは無視
    }
  }

  // 終了まで待機
  private waitForExit(): Promise<void> {
    return new Promise<void>((resolve) => {
      const debug = process.env['DEBUG_CEDIT'] === 'true';
      
      const checkExit = () => {
        if (!this.running) {
          if (debug) console.log('Editor.waitForExit: Exiting event loop');
          resolve();
        } else {
          // CPUを他のタスクに譲る
          setTimeout(checkExit, 10);
        }
      };
      
      if (debug) console.log('Editor.waitForExit: Starting event loop monitor');
      setTimeout(checkExit, 10);
    });
  }
}