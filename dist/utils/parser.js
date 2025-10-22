import fs from 'fs';
import path from 'path';
export function readFileSafe(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
    }
    catch (err) {
        console.warn(`Failed to read file ${filePath}:`, err);
    }
    return '';
}
export function parseWfcInterfaces(source) {
    if (!source) {
        return [];
    }
    const methodRegex = /^(\s*)([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/;
    const lines = source.split(/\r?\n/);
    const entries = [];
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(methodRegex);
        if (!match) {
            continue;
        }
        const methodName = match[2];
        if (methodName === 'constructor') {
            continue;
        }
        const params = match[3].trim()
            ? match[3].split(',').map((param) => param.trim()).filter(Boolean)
            : [];
        let jsdoc;
        let probe = index - 1;
        if (probe >= 0 && lines[probe].trim().endsWith('*/')) {
            const buffer = [];
            while (probe >= 0) {
                buffer.unshift(lines[probe]);
                if (lines[probe].trim().startsWith('/**')) {
                    break;
                }
                probe -= 1;
            }
            jsdoc = buffer.join('\n').trim();
        }
        entries.push({
            name: methodName,
            params,
            jsdoc,
        });
    }
    return dedupeByName(entries);
}
function dedupeByName(list) {
    const map = new Map();
    for (const entry of list) {
        if (!map.has(entry.name)) {
            map.set(entry.name, entry);
        }
    }
    return Array.from(map.values());
}
export function extractInterfaceDocs(interfaces, name) {
    return interfaces.find((item) => item.name === name);
}
export function parseEvents(source) {
    if (!source) {
        return [];
    }
    const regex = /static\s+([A-Za-z_$][\w$]*)\s*=\s*['"]([^'"]+)['"];?/g;
    const results = [];
    let match;
    while ((match = regex.exec(source)) !== null) {
        results.push({ name: match[1], value: match[2] });
    }
    return results;
}
function extractClassMeta(source, filePath) {
    const extendRegex = /export\s+default\s+class\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_]+)/;
    const classRegex = /export\s+default\s+class\s+([A-Za-z0-9_]+)/;
    const blocks = [];
    const lines = source.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const extendMatch = line.match(extendRegex);
        if (extendMatch) {
            const className = extendMatch[1];
            const baseClass = extendMatch[2];
            let jsdoc;
            let probe = index - 1;
            if (probe >= 0 && lines[probe].trim().endsWith('*/')) {
                const buffer = [];
                while (probe >= 0) {
                    buffer.unshift(lines[probe]);
                    if (lines[probe].trim().startsWith('/**')) {
                        break;
                    }
                    probe -= 1;
                }
                jsdoc = buffer.join('\n').trim();
            }
            blocks.push({ filePath, className, baseClass, jsdoc });
            continue;
        }
        const classMatch = line.match(classRegex);
        if (classMatch) {
            const className = classMatch[1];
            let jsdoc;
            let probe = index - 1;
            if (probe >= 0 && lines[probe].trim().endsWith('*/')) {
                const buffer = [];
                while (probe >= 0) {
                    buffer.unshift(lines[probe]);
                    if (lines[probe].trim().startsWith('/**')) {
                        break;
                    }
                    probe -= 1;
                }
                jsdoc = buffer.join('\n').trim();
            }
            blocks.push({ filePath, className, jsdoc });
        }
    }
    return blocks;
}
function parseMessageConfig(source) {
    if (!source) {
        return [];
    }
    const regex = /\{\s*name:\s*'([^']+)'\s*,\s*flag:\s*([^,]+)\s*,\s*type:\s*MessageContentType\.([A-Za-z0-9_]+)\s*,\s*contentClazz:\s*([A-Za-z0-9_]+)\s*\}/g;
    const results = [];
    let match;
    while ((match = regex.exec(source)) !== null) {
        results.push({
            name: match[1],
            flag: match[2].trim(),
            typeEnum: match[3],
            contentClazz: match[4],
        });
    }
    return results;
}
function parseEnumFile(source) {
    if (!source) {
        return [];
    }
    const lines = source.split(/\r?\n/);
    const entries = [];
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/static\s+([A-Za-z0-9_]+)\s*=\s*([^;]+)/);
        if (!match) {
            continue;
        }
        const enumName = match[1];
        const value = Number(match[2].trim());
        if (Number.isNaN(value)) {
            continue;
        }
        let jsdoc;
        let probe = index - 1;
        if (probe >= 0 && lines[probe].trim().endsWith('*/')) {
            const buffer = [];
            while (probe >= 0) {
                buffer.unshift(lines[probe]);
                if (lines[probe].trim().startsWith('/**')) {
                    break;
                }
                probe -= 1;
            }
            jsdoc = buffer.join('\n').trim();
        }
        entries.push({ enumName, value, jsdoc });
    }
    return entries;
}
function parsePersistFlags(source) {
    if (!source) {
        return [];
    }
    const lines = source.split(/\r?\n/);
    const results = [];
    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/static\s+([A-Za-z0-9_]+)\s*=\s*([^;]+)/);
        if (!match) {
            continue;
        }
        const name = match[1];
        const value = Number(match[2].trim());
        if (Number.isNaN(value)) {
            continue;
        }
        let jsdoc;
        let probe = index - 1;
        if (probe >= 0 && lines[probe].trim().endsWith('*/')) {
            const buffer = [];
            while (probe >= 0) {
                buffer.unshift(lines[probe]);
                if (lines[probe].trim().startsWith('/**')) {
                    break;
                }
                probe -= 1;
            }
            jsdoc = buffer.join('\n').trim();
        }
        results.push({ name, value, jsdoc });
    }
    return results;
}
export function parseMessageMeta(options) {
    const configSource = readFileSafe(options.messageConfigPath);
    if (!configSource) {
        return [];
    }
    const enumSource = readFileSafe(options.messageContentTypePath);
    const flagSource = readFileSafe(options.persistFlagPath);
    const enumEntries = parseEnumFile(enumSource);
    const flagEntries = parsePersistFlags(flagSource);
    const enumMap = new Map(enumEntries.map((entry) => [entry.enumName, entry]));
    const flagMap = new Map(flagEntries.map((entry) => [entry.name, entry]));
    const configEntries = parseMessageConfig(configSource);
    const classMetaMap = new Map();
    if (fs.existsSync(options.messageDir)) {
        const files = fs.readdirSync(options.messageDir);
        for (const fileName of files) {
            if (!fileName.endsWith('.js') && !fileName.endsWith('.ts')) {
                continue;
            }
            const fullPath = path.join(options.messageDir, fileName);
            const content = readFileSafe(fullPath);
            if (!content) {
                continue;
            }
            const classes = extractClassMeta(content, fullPath);
            for (const classInfo of classes) {
                classMetaMap.set(classInfo.className, {
                    filePath: fullPath,
                    className: classInfo.className,
                    baseClass: classInfo.baseClass,
                    jsdoc: classInfo.jsdoc,
                });
            }
        }
    }
    return configEntries.map((entry) => {
        const meta = classMetaMap.get(entry.contentClazz);
        const enumInfo = enumMap.get(entry.typeEnum);
        const flagInfo = flagMap.get(entry.flag);
        return {
            name: entry.name,
            flag: entry.flag,
            flagValue: flagInfo?.value,
            flagDescription: flagInfo?.jsdoc,
            typeEnum: entry.typeEnum,
            typeValue: enumInfo?.value,
            typeDescription: enumInfo?.jsdoc,
            contentClazz: entry.contentClazz,
            classFile: meta?.filePath,
            extends: meta?.baseClass,
            jsdoc: meta?.jsdoc,
        };
    });
}
