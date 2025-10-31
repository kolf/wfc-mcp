#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
    try {
        // 构建到 dist 目录的路径
        const distIndexPath = resolve(__dirname, 'index.js');
        
        // 使用 node 执行 dist/index.js
        const child = spawn('node', [distIndexPath], {
            stdio: 'inherit',
            cwd: resolve(__dirname, '..')
        });
        
        child.on('close', (code) => {
            process.exit(code || 0);
        });
        
        child.on('error', (err) => {
            console.error('Failed to start WFC MCP Server:', err);
            process.exit(1);
        });
    } catch (error) {
        console.error('Error starting WFC MCP Server:', error);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}