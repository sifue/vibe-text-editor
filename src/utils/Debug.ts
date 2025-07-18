import { CursorPosition } from '../editor/Cursor';
import { TextUtils } from './TextUtils';

// デバッグユーティリティ
export class Debug {
  // デバッグモードかチェック
  static isEnabled(): boolean {
    return process.env['DEBUG_CEDIT'] === 'true';
  }

  // カーソル位置のデバッグ情報をログ出力
  static logCursorPosition(cursor: CursorPosition, line: string, context: string = ''): void {
    if (!this.isEnabled()) return;
    
    const prefix = context ? `[${context}] ` : '';
    console.log(`${prefix}Cursor: row=${cursor.row}, col=${cursor.col}, displayCol=${cursor.displayCol}`);
    console.log(`${prefix}Line: "${line}"`);
    console.log(`${prefix}Line length: ${line.length}, Line width: ${TextUtils.getStringWidth(line)}`);
    console.log(`${prefix}Line bytes: ${Buffer.from(line).length}`);
    
    // 文字ごとの詳細情報
    if (line.length > 0) {
      const chars = [...line];
      console.log(`${prefix}Chars:`, chars.map((char, i) => ({
        index: i,
        char: char,
        code: char.codePointAt(0),
        width: TextUtils.getCharWidth(char)
      })));
    }
  }

  // テキストバッファの状態をログ出力
  static logBufferState(buffer: any, context: string = ''): void {
    if (!this.isEnabled()) return;
    
    const prefix = context ? `[${context}] ` : '';
    console.log(`${prefix}Buffer: lines=${buffer.totalLines}, modified=${buffer.modified}`);
    console.log(`${prefix}Max line length: ${buffer.maxLineLength}`);
  }

  // ビューポートの状態をログ出力
  static logViewportState(viewport: any, context: string = ''): void {
    if (!this.isEnabled()) return;
    
    const info = viewport.getInfo();
    const prefix = context ? `[${context}] ` : '';
    console.log(`${prefix}Viewport: startRow=${info.startRow}, startCol=${info.startCol}`);
    console.log(`${prefix}Viewport: height=${info.height}, width=${info.width}`);
  }

  // キーイベントをログ出力
  static logKeyEvent(key: string, ch: string, context: string = ''): void {
    if (!this.isEnabled()) return;
    
    const prefix = context ? `[${context}] ` : '';
    console.log(`${prefix}Key: "${key}", Char: "${ch}"`);
    if (ch) {
      console.log(`${prefix}Char code: ${ch.charCodeAt(0)}, Width: ${TextUtils.getCharWidth(ch)}`);
    }
  }

  // エラー情報をログ出力
  static logError(error: Error, context: string = ''): void {
    const prefix = context ? `[${context}] ` : '';
    console.error(`${prefix}Error: ${error.message}`);
    console.error(`${prefix}Stack: ${error.stack}`);
  }

  // パフォーマンス測定開始
  static startTimer(label: string): void {
    if (!this.isEnabled()) return;
    console.time(label);
  }

  // パフォーマンス測定終了
  static endTimer(label: string): void {
    if (!this.isEnabled()) return;
    console.timeEnd(label);
  }

  // メモリ使用量をログ出力
  static logMemoryUsage(context: string = ''): void {
    if (!this.isEnabled()) return;
    
    const usage = process.memoryUsage();
    const prefix = context ? `[${context}] ` : '';
    console.log(`${prefix}Memory: RSS=${Math.round(usage.rss / 1024 / 1024)}MB, ` +
                `Heap=${Math.round(usage.heapUsed / 1024 / 1024)}MB/` +
                `${Math.round(usage.heapTotal / 1024 / 1024)}MB`);
  }

  // 文字列の詳細情報をログ出力
  static logStringDetails(text: string, context: string = ''): void {
    if (!this.isEnabled()) return;
    
    const info = TextUtils.getStringInfo(text);
    const prefix = context ? `[${context}] ` : '';
    console.log(`${prefix}String: "${text}"`);
    console.log(`${prefix}Length: ${info.length}, Width: ${info.width}`);
    console.log(`${prefix}Chars:`, info.chars);
  }
}