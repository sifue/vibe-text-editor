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
    
    // 制御文字は幅0（タブと改行は除く）
    if (code < 0x20) {
      width = code === 0x09 ? 4 : 0; // タブは4文字分
    }
    // ASCII文字は半角
    else if (code < 0x7F) {
      width = 1;
    }
    // 全角スペース
    else if (code === 0x3000) {
      width = 2;
    }
    // 日本語文字の判定（WSL2対応）
    else if (
      // CJK統合漢字
      (code >= 0x4E00 && code <= 0x9FFF) ||
      // CJK統合漢字拡張A
      (code >= 0x3400 && code <= 0x4DBF) ||
      // ひらがな
      (code >= 0x3040 && code <= 0x309F) ||
      // カタカナ
      (code >= 0x30A0 && code <= 0x30FF) ||
      // 全角英数字・記号
      (code >= 0xFF01 && code <= 0xFF5E) ||
      // 半角カタカナ（実際は半角だが、WSL2では全角扱い）
      (code >= 0xFF61 && code <= 0xFF9F)
    ) {
      width = 2;
    }
    // その他の東アジア文字
    else if (
      // CJK記号・句読点
      (code >= 0x3000 && code <= 0x303F) ||
      // CJK部首補助
      (code >= 0x2E80 && code <= 0x2EFF) ||
      // 康熙部首
      (code >= 0x2F00 && code <= 0x2FDF) ||
      // CJK互換文字
      (code >= 0x3300 && code <= 0x33FF) ||
      // CJK統合漢字拡張B
      (code >= 0x20000 && code <= 0x2A6DF) ||
      // 囲み英数字
      (code >= 0x2460 && code <= 0x24FF) ||
      // 矢印
      (code >= 0x2190 && code <= 0x21FF) ||
      // 数学記号
      (code >= 0x2200 && code <= 0x22FF) ||
      // 幾何学記号
      (code >= 0x25A0 && code <= 0x25FF) ||
      // 装飾記号
      (code >= 0x2600 && code <= 0x26FF)
    ) {
      width = 2;
    }
    // その他の文字（絵文字など）
    else if (
      // 絵文字
      (code >= 0x1F600 && code <= 0x1F64F) ||
      (code >= 0x1F300 && code <= 0x1F5FF) ||
      (code >= 0x1F680 && code <= 0x1F6FF) ||
      (code >= 0x1F700 && code <= 0x1F77F) ||
      (code >= 0x1F780 && code <= 0x1F7FF) ||
      (code >= 0x1F800 && code <= 0x1F8FF) ||
      (code >= 0x1F900 && code <= 0x1F9FF) ||
      (code >= 0x1FA00 && code <= 0x1FA6F) ||
      (code >= 0x1FA70 && code <= 0x1FAFF)
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
      
      // 次の文字を追加すると目標幅を超える場合
      if (width + charWidth > targetWidth) {
        // 現在位置と次の位置のどちらが目標に近いかを判定
        const currentDistance = Math.abs(targetWidth - width);
        const nextDistance = Math.abs(targetWidth - (width + charWidth));
        
        if (nextDistance < currentDistance) {
          index++;
        }
        break;
      }
      
      width += charWidth;
      index++;
      
      // 正確に目標幅に達した場合
      if (width === targetWidth) {
        break;
      }
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