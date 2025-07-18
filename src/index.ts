#!/usr/bin/env node

import { Command } from 'commander';
import { Editor } from './editor/Editor';
import { FileIO } from './utils/FileIO';
import chalk from 'chalk';

const program = new Command();

program
  .name('cedit')
  .description('コンソールテキストエディタ - アンドゥ・リドゥ機能付き')
  .version('1.0.0')
  .argument('[file]', '編集するファイル')
  .option('-r, --readonly', '読み取り専用モードで開く')
  .option('-l, --line <number>', '指定行にジャンプ')
  .option('-c, --column <number>', '指定列にジャンプ')
  .action(async (file, options) => {
    try {
      console.log(chalk.blue('Vibe Text Editor - 起動中...'));
      
      let content = '';
      let filePath = file;
      
      if (file) {
        // ファイルが指定された場合
        if (await FileIO.exists(file)) {
          console.log(chalk.green(`ファイルを読み込み中: ${file}`));
          content = await FileIO.readFile(file);
          
          // 大容量ファイルの警告
          const sizeMB = await FileIO.getFileSizeMB(file);
          if (sizeMB > 10) {
            console.log(chalk.yellow(`注意: ${sizeMB.toFixed(2)}MB の大容量ファイルです`));
          }
        } else {
          console.log(chalk.cyan(`新規ファイル: ${file}`));
        }
      } else {
        console.log(chalk.cyan('新規ファイル（無題）'));
      }
      
      // エディタを起動
      const editor = new Editor(content, filePath, options);
      await editor.start();
      
    } catch (error) {
      console.error(chalk.red('エラーが発生しました:'), error);
      process.exit(1);
    }
  });

program.parse();