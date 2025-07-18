// テキスト処理ユーティリティ
export class TextUtils {
  // 文字幅のキャッシュ
  private static widthCache = new Map<string, number>();
  
  // 文字の表示幅を取得（全角=2、半角=1）
  static getCharWidth(char: string): number {
    if (!char) return 0;
    
    // キャッシュから取得
    if (this.widthCache.has(char)) {
      return this.widthCache.get(char)!;
    }
    
    const code = char.codePointAt(0);
    if (code === undefined) return 0;
    
    let width: number;
    
    // 制御文字は幅0
    if (code < 0x20) {
      width = 0;
    }
    // よく使用される文字の高速判定
    else if (code < 0x7F) {
      // ASCII文字は半角
      width = 1;
    }
    // 日本語文字の高速判定
    else if (
      // CJK統合漢字（最も使用頻度が高い）
      (code >= 0x4E00 && code <= 0x9FFF) ||
      // ひらがな・カタカナ
      (code >= 0x3040 && code <= 0x30FF) ||
      // 全角記号
      (code >= 0xFF01 && code <= 0xFF5E)
    ) {
      width = 2;
    }
    // その他の全角文字
    else if (
      (code >= 0x3000 && code <= 0x303F) ||
      (code >= 0x2E80 && code <= 0x2EFF) ||
      (code >= 0x2F00 && code <= 0x2FDF) ||
      (code >= 0x31C0 && code <= 0x31EF) ||
      (code >= 0x3200 && code <= 0x32FF) ||
      (code >= 0x3300 && code <= 0x33FF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0xFE30 && code <= 0xFE4F)
    ) {
      width = 2;
    }
    // デフォルトは半角
    else {
      width = 1;
    }
    
    // キャッシュに保存（メモリ使用量を制限）
    if (this.widthCache.size < 1000) {
      this.widthCache.set(char, width);
    }
    
    return width;
  }
  
  // 文字列の表示幅を取得
  static getStringWidth(text: string): number {
    if (!text) return 0;
    
    let width = 0;
    for (const char of text) {
      width += this.getCharWidth(char);
    }
    return width;
  }
  
  // 指定表示位置の文字インデックスを取得
  static getCharIndexFromDisplayWidth(text: string, targetWidth: number): number {
    if (!text || targetWidth <= 0) return 0;
    
    let width = 0;
    let index = 0;
    
    for (const char of text) {
      const charWidth = this.getCharWidth(char);
      if (width + charWidth > targetWidth) {
        break;
      }
      width += charWidth;
      index++;
    }
    
    return index;
  }
  
  // 指定文字インデックスの表示位置を取得
  static getDisplayWidthFromCharIndex(text: string, charIndex: number): number {
    if (!text || charIndex <= 0) return 0;
    
    let width = 0;
    let index = 0;
    
    for (const char of text) {
      if (index >= charIndex) break;
      width += this.getCharWidth(char);
      index++;
    }
    
    return width;
  }
  
  // 文字列を指定表示幅で切り取り
  static truncateByDisplayWidth(text: string, maxWidth: number): string {
    if (!text || maxWidth <= 0) return '';
    
    let width = 0;
    let result = '';
    
    for (const char of text) {
      const charWidth = this.getCharWidth(char);
      if (width + charWidth > maxWidth) {
        break;
      }
      result += char;
      width += charWidth;
    }
    
    return result;
  }
  
  // 文字列を指定表示幅で右詰めパディング
  static padRight(text: string, totalWidth: number, padChar: string = ' '): string {
    const currentWidth = this.getStringWidth(text);
    if (currentWidth >= totalWidth) return text;
    
    const padWidth = totalWidth - currentWidth;
    return text + padChar.repeat(padWidth);
  }
  
  // 文字列を指定表示幅で左詰めパディング
  static padLeft(text: string, totalWidth: number, padChar: string = ' '): string {
    const currentWidth = this.getStringWidth(text);
    if (currentWidth >= totalWidth) return text;
    
    const padWidth = totalWidth - currentWidth;
    return padChar.repeat(padWidth) + text;
  }
  
  // 文字列を指定表示幅で中央揃え
  static padCenter(text: string, totalWidth: number, padChar: string = ' '): string {
    const currentWidth = this.getStringWidth(text);
    if (currentWidth >= totalWidth) return text;
    
    const padWidth = totalWidth - currentWidth;
    const leftPad = Math.floor(padWidth / 2);
    const rightPad = padWidth - leftPad;
    
    return padChar.repeat(leftPad) + text + padChar.repeat(rightPad);
  }
  
  // デバッグ用：文字列の詳細情報を取得
  static getStringInfo(text: string): {
    length: number;
    width: number;
    chars: { char: string; width: number; code: number }[];
  } {
    const chars = [];
    let width = 0;
    
    for (const char of text) {
      const charWidth = this.getCharWidth(char);
      const code = char.codePointAt(0) || 0;
      
      chars.push({
        char,
        width: charWidth,
        code
      });
      
      width += charWidth;
    }
    
    return {
      length: chars.length,
      width,
      chars
    };
  }
}