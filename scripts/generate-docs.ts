import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { parseEvents, parseMessageMeta, parseWfcInterfaces } from '../src/utils/parser.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORKSPACE_ROOT = findWorkspaceRoot(__dirname);
const WFC_DIR = path.join(WORKSPACE_ROOT, 'packages/sdk-middleware/wildfirechat/wfc');
const WFC_CLIENT = path.join(WFC_DIR, 'client', 'wfc.js');
const WFC_EVENT = path.join(WFC_DIR, 'client', 'wfcEvent.js');
const MESSAGE_CONFIG = path.join(WFC_DIR, 'client', 'messageConfig.js');
const MESSAGE_TYPES_DIR = path.join(WFC_DIR, 'messages');
const MESSAGE_CONTENT_TYPE_FILE = path.join(MESSAGE_TYPES_DIR, 'messageContentType.js');
const PERSIST_FLAG_FILE = path.join(MESSAGE_TYPES_DIR, 'persistFlag.js');

function ensureDirectory(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeJson(filePath: string, data: unknown) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function readFileSafe(filePath: string) {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
}

function findWorkspaceRoot(startDir: string): string {
    let currentDir = startDir;
    while (true) {
        if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
            return currentDir;
        }
        const parentDir = path.dirname(currentDir);
        if (parentDir === currentDir) {
            throw new Error(`Failed to locate workspace root from ${startDir}`);
        }
        currentDir = parentDir;
    }
}

function generateInterfaceDocs() {
    const source = readFileSafe(WFC_CLIENT);
    const interfaces = parseWfcInterfaces(source);
    const docsDir = path.join(__dirname, '../src/docs');
    ensureDirectory(docsDir);
    writeJson(path.join(docsDir, 'interfaces.json'), interfaces);
    console.log(`✔ interfaces.json updated with ${interfaces.length} entries`);
}

function generateEventDocs() {
    const source = readFileSafe(WFC_EVENT);
    const events = parseEvents(source);
    const docsDir = path.join(__dirname, '../src/docs');
    ensureDirectory(docsDir);
    writeJson(path.join(docsDir, 'events.json'), events);
    console.log(`✔ events.json updated with ${events.length} entries`);
}

function generateMessageTypeDocs() {
    const meta = parseMessageMeta({
        messageConfigPath: MESSAGE_CONFIG,
        messageDir: MESSAGE_TYPES_DIR,
        messageContentTypePath: MESSAGE_CONTENT_TYPE_FILE,
        persistFlagPath: PERSIST_FLAG_FILE
    });
    const docsDir = path.join(__dirname, '../src/docs');
    ensureDirectory(docsDir);
    writeJson(path.join(docsDir, 'message-types.json'), meta);
    console.log(`✔ message-types.json updated with ${meta.length} entries`);
}

function main() {
    try {
        generateInterfaceDocs();
        generateEventDocs();
        generateMessageTypeDocs();
    } catch (error) {
        console.error('Failed to generate docs:', error);
        process.exit(1);
    }
}

main();
