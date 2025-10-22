import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import events from './docs/events.json' with { type: 'json' };
import interfaces from './docs/interfaces.json' with { type: 'json' };
import messageTypesRaw from './docs/message-types.json' with { type: 'json' };
const interfaceList = interfaces;
const messageTypes = messageTypesRaw;
async function main() {
    const server = new McpServer({ name: 'WFC MCP Server', version: '0.1.0' }, { capabilities: { tools: {} } });
    server.tool('get-interface-list', '列出wfc方法名与参数', async () => ({ content: [{ type: 'text', text: JSON.stringify(interfaceList, null, 2) }] }));
    server.tool('get-interface-docs', '根据接口名返回其文档（从已生成文档检索）', { name: z.string().describe('接口方法名，例如 getUserId') }, async ({ name }) => {
        const target = interfaceList.find((item) => item.name === name);
        if (!target) {
            return { content: [{ type: 'text', text: `未找到接口: ${name}` }] };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({ name: target.name, params: target.params, jsdoc: target.jsdoc ?? '' }, null, 2),
                },
            ],
        };
    });
    server.tool('get-event-list', '列出wfc事件', async () => ({ content: [{ type: 'text', text: JSON.stringify(events, null, 2) }] }));
    server.tool('get-message-types', '列出消息类型（从预生成文档读取）', async () => {
        const sorted = [...messageTypes].sort((a, b) => (a.typeValue ?? 0) - (b.typeValue ?? 0));
        return { content: [{ type: 'text', text: JSON.stringify(sorted, null, 2) }] };
    });
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error('Failed to start WFC MCP Server:', err);
    process.exit(1);
});
