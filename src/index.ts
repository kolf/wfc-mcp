import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import express, { Request, Response, NextFunction } from "express";
import type { EventInfo, InterfaceInfo, MessageTypeInfo } from "./types.js";

// 配置常量
const CONFIG = {
  SERVER_NAME: "WFC MCP Server",
  SERVER_VERSION: "0.1.0",
  HTTP_PORT: 3000,
  DATA_FILES: {
    INTERFACES: "./docs/interfaces.json",
    EVENTS: "./docs/events.json",
    MESSAGE_TYPES: "./docs/message-types.json",
  },
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载数据文件
const loadJsonData = (filePath: string) => {
  const absolutePath = path.join(__dirname, filePath);
  return JSON.parse(readFileSync(absolutePath, 'utf-8'));
};

try {
  const interfacesData: InterfaceInfo[] = loadJsonData(CONFIG.DATA_FILES.INTERFACES);
  const eventsData: EventInfo[] = loadJsonData(CONFIG.DATA_FILES.EVENTS);
  const messageTypesData: MessageTypeInfo[] = loadJsonData(CONFIG.DATA_FILES.MESSAGE_TYPES);

  // 创建Express应用
  const app = express();

  // 创建MCP服务器
  const createMcpServer = () => {
    const server = new McpServer({
      name: CONFIG.SERVER_NAME,
      version: CONFIG.SERVER_VERSION,
    });

    // 注册工具：获取所有接口列表
    server.tool(
      "list_interfaces",
      {
        description: "获取WFC所有接口列表",
        inputSchema: z.object({}),
      },
      async () => {
        return {
          interfaces: interfacesData.map(i => ({
            name: i.name,
            params: i.params
          }))
        };
      }
    );

    // 注册工具：获取接口详情
    server.tool(
      "get_interface_detail",
      {
        description: "获取特定接口的详细信息",
        inputSchema: z.object({
          name: z.string().describe("接口名称"),
        }),
      },
      async (input: { name: string }) => {
        const interfaceDetail = interfacesData.find(i => i.name === input.name);
        if (!interfaceDetail) {
          throw new Error(`Interface ${input.name} not found`);
        }
        return interfaceDetail;
      }
    );

    // 注册工具：获取所有事件列表
    server.tool(
      "list_events",
      {
        description: "获取WFC所有事件列表",
        inputSchema: z.object({}),
      },
      async () => {
        return {
          events: eventsData
        };
      }
    );

    // 注册工具：获取所有消息类型
    server.tool(
      "list_message_types",
      {
        description: "获取WFC所有消息类型",
        inputSchema: z.object({}),
      },
      async () => {
        return {
          messageTypes: messageTypesData.map(m => ({
            name: m.name,
            typeEnum: m.typeEnum,
            flag: m.flag,
            contentClazz: m.contentClazz
          }))
        };
      }
    );

    // 注册工具：获取特定消息类型的详细信息
    server.tool(
      "get_message_type_detail",
      {
        description: "获取特定消息类型的详细信息",
        inputSchema: z.object({
          name: z.string().describe("消息类型名称"),
        }),
      },
      async (input: { name: string }) => {
        const messageTypeDetail = messageTypesData.find(m => m.name === input.name);
        if (!messageTypeDetail) {
          throw new Error(`Message type ${input.name} not found`);
        }
        return messageTypeDetail;
      }
    );

    return server;
  };

  // 设置路由处理MCP SSE连接
  app.get("/sse", async (req: Request, res: Response) => {
    const server = createMcpServer();
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
  });

  // 提供消息端点
  app.post("/messages", express.json(), async (req: Request, res: Response) => {
    // 这里应该处理来自客户端的消息
    res.status(200).send({});
  });

  // 启动服务器
  const server = app.listen(CONFIG.HTTP_PORT, () => {
    console.log(`${CONFIG.SERVER_NAME} 正在监听端口 ${CONFIG.HTTP_PORT}`);
    console.log(`SSE endpoint: http://localhost:${CONFIG.HTTP_PORT}/sse`);
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('正在关闭服务器...');
    server.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  });

} catch (error) {
  console.error('启动服务器时出错:', error);
  process.exit(1);
}