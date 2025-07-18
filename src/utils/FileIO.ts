import * as fs from 'fs';
import * as path from 'path';
import * as iconv from 'iconv-lite';

// ファイルI/Oユーティリティクラス
export class FileIO {
  // BOMを検出して適切な文字コードを判定
  static detectEncoding(buffer: Buffer): { encoding: string; bomLength: number } {
    // UTF-8 BOM検出
    if (buffer.length >= 3 && 
        buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      return { encoding: 'utf8', bomLength: 3 };
    }
    
    // UTF-16 LE BOM検出
    if (buffer.length >= 2 && 
        buffer[0] === 0xFF && buffer[1] === 0xFE) {
      return { encoding: 'utf16le', bomLength: 2 };
    }
    
    // UTF-16 BE BOM検出
    if (buffer.length >= 2 && 
        buffer[0] === 0xFE && buffer[1] === 0xFF) {
      return { encoding: 'utf16be', bomLength: 2 };
    }
    
    // BOMなし - UTF-8バリデーション
    try {
      const testString = iconv.decode(buffer, 'utf8');
      // 制御文字や無効な文字の検出
      if (this.isValidUtf8(testString)) {
        return { encoding: 'utf8', bomLength: 0 };
      }
    } catch {
      // UTF-8デコードに失敗
    }
    
    // デフォルトでASCII
    return { encoding: 'ascii', bomLength: 0 };
  }
  
  // UTF-8として有効な文字列かチェック（軽量化版）
  private static isValidUtf8(text: string): boolean {
    // 空文字列は有効
    if (text.length === 0) return true;
    
    // 小さなファイルは簡単なチェックのみ
    if (text.length < 1000) {
      // 最初の100文字だけをチェック
      const checkLength = Math.min(text.length, 100);
      let controlChars = 0;
      
      for (let i = 0; i < checkLength; i++) {
        const code = text.charCodeAt(i);
        if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
          controlChars++;
        }
      }
      
      // 制御文字が20%以上の場合は無効
      return controlChars / checkLength < 0.2;
    }
    
    // 大きなファイルはサンプリング方式
    const sampleSize = 500;
    const step = Math.floor(text.length / sampleSize);
    let controlChars = 0;
    let sampleCount = 0;
    
    for (let i = 0; i < text.length && sampleCount < sampleSize; i += step) {
      const code = text.charCodeAt(i);
      if (code < 0x20 && code !== 0x09 && code !== 0x0A && code !== 0x0D) {
        controlChars++;
      }
      sampleCount++;
    }
    
    // 制御文字が10%以上の場合は無効
    return controlChars / sampleCount < 0.1;
  }

  // ファイルを読み込み
  static async readFile(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const buffer = await fs.promises.readFile(absolutePath);
      
      // デバッグ情報（process.env チェック）
      const debug = process.env['DEBUG_CEDIT'] === 'true';
      if (debug) {
        console.log(`Reading file: ${absolutePath} (${buffer.length} bytes)`);
      }
      
      // 文字コードとBOMを検出
      const { encoding, bomLength } = this.detectEncoding(buffer);
      
      if (debug) {
        console.log(`Detected encoding: ${encoding}, BOM length: ${bomLength}`);
      }
      
      // BOMを除去してデコード
      const contentBuffer = buffer.slice(bomLength);
      const content = iconv.decode(contentBuffer, encoding);
      
      if (debug) {
        console.log(`Decoded content length: ${content.length} chars`);
      }
      
      return content;
    } catch (error) {
      throw new Error(`ファイルの読み込みに失敗しました: ${filePath} - ${error}`);
    }
  }

  // ファイルを保存
  static async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const absolutePath = path.resolve(filePath);
      const buffer = iconv.encode(content, 'utf8');
      
      // ディレクトリが存在しない場合は作成
      const dirPath = path.dirname(absolutePath);
      await fs.promises.mkdir(dirPath, { recursive: true });
      
      await fs.promises.writeFile(absolutePath, buffer);
    } catch (error) {
      throw new Error(`ファイルの保存に失敗しました: ${filePath} - ${error}`);
    }
  }

  // ファイルが存在するかチェック
  static async exists(filePath: string): Promise<boolean> {
    try {
      const absolutePath = path.resolve(filePath);
      await fs.promises.access(absolutePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ファイルの統計情報を取得
  static async getStats(filePath: string): Promise<fs.Stats | null> {
    try {
      const absolutePath = path.resolve(filePath);
      return await fs.promises.stat(absolutePath);
    } catch {
      return null;
    }
  }

  // ファイルサイズを取得（MB単位）
  static async getFileSizeMB(filePath: string): Promise<number> {
    const stats = await this.getStats(filePath);
    if (!stats) return 0;
    return stats.size / (1024 * 1024);
  }

  // 大容量ファイルを分割読み込み
  static async readFileChunked(filePath: string, chunkSize: number = 1024 * 1024): Promise<string[]> {
    try {
      const absolutePath = path.resolve(filePath);
      const stats = await fs.promises.stat(absolutePath);
      const chunks: string[] = [];
      
      const fileHandle = await fs.promises.open(absolutePath, 'r');
      let position = 0;
      
      while (position < stats.size) {
        const buffer = Buffer.alloc(Math.min(chunkSize, stats.size - position));
        const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, position);
        
        if (bytesRead === 0) break;
        
        const chunk = iconv.decode(buffer.subarray(0, bytesRead), 'utf8');
        chunks.push(chunk);
        position += bytesRead;
      }
      
      await fileHandle.close();
      return chunks;
    } catch (error) {
      throw new Error(`分割読み込みに失敗しました: ${filePath} - ${error}`);
    }
  }

  // バックアップファイルを作成
  static async createBackup(filePath: string): Promise<string> {
    try {
      const absolutePath = path.resolve(filePath);
      const backupPath = `${absolutePath}.backup`;
      await fs.promises.copyFile(absolutePath, backupPath);
      return backupPath;
    } catch (error) {
      throw new Error(`バックアップの作成に失敗しました: ${filePath} - ${error}`);
    }
  }
}