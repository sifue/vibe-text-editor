import blessed from 'blessed';
import { TextBufferManager } from '../editor/TextBuffer';
import { Cursor } from '../editor/Cursor';
import { Viewport } from '../editor/Viewport';
import { TextUtils } from '../utils/TextUtils';

// 画面描画クラス
export class Screen {
  private screen: blessed.Widgets.Screen;
  private textBox: blessed.Widgets.BoxElement;
  private statusBar: blessed.Widgets.BoxElement;
  private infoBar: blessed.Widgets.BoxElement;

  constructor() {
    // WSL2環境の検出
    const isWSL = process.env['WSL_DISTRO_NAME'] !== undefined || 
                  process.env['WSLENV'] !== undefined ||
                  process.env['NAME']?.includes('Microsoft') ||
                  process.platform === 'linux' && process.env['PATH']?.includes('Windows');
    
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Vibe Text Editor',
      autoPadding: true,
      dockBorders: true,
      fullUnicode: true,
      sendFocus: true,
      useBCE: true,
      tabSize: 4,
      debug: false,
      // WSL2環境での特別な設定
      ...(isWSL && {
        artificialCursor: true,
        cursorBlink: true,
        cursorShape: 'block'
      })
    });

    // メインテキスト表示領域
    this.textBox = blessed.box({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-2',
      content: '',
      tags: true,
      scrollable: false,
      alwaysScroll: false,
      mouse: true,
      keys: true,
      vi: false,
      wrap: false,
      shrink: false,
      style: {
        fg: 'white',
        bg: 'black',
        focus: {
          bg: 'black'
        }
      }
    });

    // ステータスバー（上部）
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      tags: true,
      style: {
        fg: 'black',
        bg: 'white'
      }
    });

    // 情報バー（下部）
    this.infoBar = blessed.box({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      content: '',
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });

    // フォーカスをテキストボックスに設定
    this.textBox.focus();
    
    // blessed screenの初期化を待つ
    this.screen.on('resize', () => {
      // リサイズイベントが発生したらサイズが利用可能
    });
  }

  // 画面を更新
  update(
    buffer: TextBufferManager,
    cursor: Cursor,
    viewport: Viewport,
    filename: string | undefined,
    canUndo: boolean,
    canRedo: boolean
  ): void {
    // テキスト内容を更新
    this.updateTextContent(buffer, cursor, viewport);
    
    // ステータスバーを更新
    this.updateStatusBar(filename, buffer.getLineCount());
    
    // 情報バーを更新
    this.updateInfoBar(cursor, buffer.isModified(), canUndo, canRedo);
    
    // 画面を再描画
    this.screen.render();
  }

  // テキスト内容を更新
  private updateTextContent(buffer: TextBufferManager, cursor: Cursor, viewport: Viewport): void {
    const visibleLines = viewport.getVisibleLines(buffer);
    const cursorPosition = cursor.getPosition();
    const screenPosition = viewport.bufferToScreenPosition(cursorPosition);
    
    let content = '';
    for (let i = 0; i < visibleLines.length; i++) {
      const line = visibleLines[i] || '';
      
      if (i === screenPosition.row && screenPosition.col >= 0) {
        // カーソル行の場合、マルチバイト対応のカーソル位置を強調表示
        const leftPart = line.substring(0, screenPosition.col);
        const cursorChar = line.charAt(screenPosition.col) || ' ';
        const rightPart = line.substring(screenPosition.col + 1);
        
        // カーソル文字が全角文字の場合の特別な処理
        const cursorWidth = TextUtils.getCharWidth(cursorChar);
        let cursorDisplay = cursorChar;
        
        // カーソル文字が全角の場合、適切に表示
        if (cursorWidth === 2) {
          cursorDisplay = cursorChar || '　'; // 全角スペースをデフォルト
        } else if (cursorChar === '') {
          cursorDisplay = ' '; // 半角スペースをデフォルト
        }
        
        content += leftPart + `{inverse}${cursorDisplay}{/inverse}` + rightPart;
      } else {
        content += line;
      }
      
      if (i < visibleLines.length - 1) {
        content += '\n';
      }
    }
    
    this.textBox.setContent(content);
  }

  // ステータスバーを更新
  private updateStatusBar(filename: string | undefined, totalLines: number): void {
    const displayName = filename || '無題';
    const screenWidth = typeof this.screen.width === 'number' ? this.screen.width : 80;
    
    // マルチバイト対応の幅計算
    const displayNameWidth = TextUtils.getStringWidth(displayName);
    const totalLinesStr = String(totalLines);
    const totalLinesWidth = totalLinesStr.length; // 数字は常に半角
    
    const paddingWidth = Math.max(0, screenWidth - displayNameWidth - totalLinesWidth - 1);
    const content = `${displayName}${' '.repeat(paddingWidth)}${totalLinesStr}`;
    
    this.statusBar.setContent(content);
  }

  // 情報バーを更新
  private updateInfoBar(cursor: Cursor, isModified: boolean, canUndo: boolean, canRedo: boolean): void {
    const position = cursor.getPosition();
    const positionText = `行: ${position.row + 1}, 列: ${position.col + 1}, 表示: ${position.displayCol + 1}`;
    const modifiedText = isModified ? 'MODIFIED' : '';
    const encodingText = 'UTF-8';
    const undoText = canUndo ? 'Ctrl+Z: 元に戻す' : '';
    const redoText = canRedo ? 'Ctrl+Y: やり直し' : '';
    
    const parts = [positionText, modifiedText, encodingText, undoText, redoText].filter(Boolean);
    const content = parts.join(' │ ');
    
    this.infoBar.setContent(content);
  }

  // 状態メッセージを一時的に表示
  private statusMessageTimeout: NodeJS.Timeout | null = null;
  private originalInfoBarContent: string = '';

  showStatusMessage(message: string): void {
    // 既存のタイムアウトをクリア
    if (this.statusMessageTimeout) {
      clearTimeout(this.statusMessageTimeout);
      this.statusMessageTimeout = null;
    }

    // 現在の情報バーの内容を保存
    this.originalInfoBarContent = this.infoBar.getContent();
    
    // メッセージを表示
    this.infoBar.setContent(message);
    this.infoBar.style.bg = 'green';
    this.screen.render();
    
    // 3秒後に元に戻す
    this.statusMessageTimeout = setTimeout(() => {
      this.infoBar.setContent(this.originalInfoBarContent);
      this.infoBar.style.bg = 'blue';
      this.screen.render();
      this.statusMessageTimeout = null;
    }, 3000);
  }

  // キー入力をリッスン
  onKey(callback: (key: string, ch: string) => void): void {
    // 特殊キーの直接処理を追加
    this.screen.key(['C-c'], () => {
      callback('C-c', '');
    });
    
    this.screen.key(['C-s'], () => {
      callback('C-s', '');
    });
    
    this.screen.key(['C-z'], () => {
      callback('C-z', '');
    });
    
    this.screen.key(['C-y'], () => {
      callback('C-y', '');
    });
    
    // その他のキーイベント処理
    this.screen.on('keypress', (ch, key) => {
      // 特殊キーは上で処理済みなのでスキップ
      if (key.name === 'C-c' || key.name === 'C-s' || key.name === 'C-z' || key.name === 'C-y') return;
      callback(key.name, ch);
    });
  }

  // 画面サイズを取得
  getSize(): { width: number; height: number } {
    // blessed screenが初期化されていない場合のフォールバック
    let screenWidth: number;
    let screenHeight: number;
    
    // 実際のプロセス情報を最優先で使用
    screenWidth = process.stdout.columns || 80;
    screenHeight = process.stdout.rows || 25;
    
    // blessed screenのサイズが利用可能で、より大きい場合は使用
    if (this.screen.width && typeof this.screen.width === 'number' && this.screen.width > screenWidth) {
      screenWidth = this.screen.width;
    }
    
    if (this.screen.height && typeof this.screen.height === 'number' && this.screen.height > screenHeight) {
      screenHeight = this.screen.height;
    }
    
    const debug = process.env['DEBUG_CEDIT'] === 'true';
    if (debug) {
      console.log(`Screen.getSize: ${screenWidth}x${screenHeight} (blessed: ${this.screen.width}x${this.screen.height})`);
    }
    
    return {
      width: screenWidth,
      height: Math.max(1, screenHeight - 2) // ステータスバーと情報バーを除く、最小1
    };
  }

  // 画面をクリア
  clear(): void {
    this.textBox.setContent('');
    this.screen.render();
  }

  // 画面を破棄
  destroy(): void {
    this.screen.destroy();
  }

  // 画面を再描画
  render(): void {
    this.screen.render();
  }

  // リサイズイベントをリッスン
  onResize(callback: (width: number, height: number) => void): void {
    this.screen.on('resize', () => {
      const size = this.getSize();
      callback(size.width, size.height);
    });
  }
}