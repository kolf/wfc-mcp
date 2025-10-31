import { cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const srcDocsDir = join(process.cwd(), 'src', 'docs');
const distDocsDir = join(process.cwd(), 'dist', 'docs');

// 确保dist目录存在
if (!existsSync(join(process.cwd(), 'dist'))) {
  mkdirSync(join(process.cwd(), 'dist'));
}

// 复制整个docs目录
console.log(`Copying ${srcDocsDir} to ${distDocsDir}`);
cpSync(srcDocsDir, distDocsDir, { recursive: true });
console.log('Docs copied successfully!');