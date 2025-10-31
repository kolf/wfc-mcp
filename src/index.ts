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
    MESSAGE_TYPES: "./docs/message-types.json"
  }
} as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 工具函数：加载JSON文件
 */
function loadJsonFile<T>(relativePath: string): T {
  try {
    const filePath = path.resolve(__dirname, relativePath);
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(`Failed to load JSON file ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 数据加载器类
 */
class DataLoader {
  private interfaces: InterfaceInfo[];
  private events: EventInfo[];
  private messageTypes: MessageTypeInfo[];

  constructor() {
    this.interfaces = [];
    this.events = [];
    this.messageTypes = [];
  }

  /**
   * 加载所有数据文件
   */
  loadAll(): void {
    try {
      this.interfaces = loadJsonFile<InterfaceInfo[]>(CONFIG.DATA_FILES.INTERFACES);
      this.events = loadJsonFile<EventInfo[]>(CONFIG.DATA_FILES.EVENTS);
      this.messageTypes = loadJsonFile<MessageTypeInfo[]>(CONFIG.DATA_FILES.MESSAGE_TYPES);
      
      console.log(`✅ Loaded ${this.interfaces.length} interfaces, ${this.events.length} events, ${this.messageTypes.length} message types`);
    } catch (error) {
      console.error("❌ Failed to load data files:", error);
      throw error;
    }
  }

  getInterfaces(): InterfaceInfo[] {
    return this.interfaces;
  }

  getEvents(): EventInfo[] {
    return this.events;
  }

  getMessageTypes(): MessageTypeInfo[] {
    return this.messageTypes;
  }

  /**
   * 根据接口名查找接口信息
   */
  findInterfaceByName(name: string): InterfaceInfo | undefined {
    return this.interfaces.find(item => item.name === name);
  }

  /**
   * 获取排序后的消息类型
   */
  getSortedMessageTypes(): MessageTypeInfo[] {
    return [...this.messageTypes].sort((a, b) => (a.typeValue ?? 0) - (b.typeValue ?? 0));
  }
}

/**
 * MCP工具注册器类
 */
class ToolRegistry {
  private server: any;
  private dataLoader: DataLoader;

  constructor(server: any, dataLoader: DataLoader) {
    this.server = server;
    this.dataLoader = dataLoader;
  }

  /**
   * 注册所有工具
   */
  registerAllTools(): void {
    this.registerGetInterfaceList();
    this.registerGetInterfaceDocs();
    this.registerGetEventList();
    this.registerGetMessageTypes();
    console.log("✅ All tools registered successfully");
  }

  /**
   * 注册获取接口列表工具
   */
  private registerGetInterfaceList(): void {
    this.server.tool(
      "get-interface-list",
      "列出WFC方法名与参数",
      async () => ({
        content: [{
          type: "text",
          text: JSON.stringify(this.dataLoader.getInterfaces(), null, 2)
        }]
      })
    );
  }

  /**
   * 注册获取接口文档工具
   */
  private registerGetInterfaceDocs(): void {
    this.server.tool(
      "get-interface-docs",
      "根据接口名返回其文档（从已生成文档检索）",
      { 
        name: z.string().describe("接口方法名，例如 getUserId") 
      },
      async ({ name }: { name: string }) => {
        const target = this.dataLoader.findInterfaceByName(name);
        
        if (!target) {
          return { 
            content: [{ 
              type: "text", 
              text: `未找到接口: ${name}` 
            }] 
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(
              {
                name: target.name,
                params: target.params,
                jsdoc: target.jsdoc ?? ""
              },
              null,
              2
            )
          }]
        };
      }
    );
  }

  /**
   * 注册获取事件列表工具
   */
  private registerGetEventList(): void {
    this.server.tool(
      "get-event-list",
      "列出WFC事件",
      async () => ({
        content: [{
          type: "text",
          text: JSON.stringify(this.dataLoader.getEvents(), null, 2)
        }]
      })
    );
  }

  /**
   * 注册获取消息类型工具
   */
  private registerGetMessageTypes(): void {
    this.server.tool(
      "get-message-types",
      "列出消息类型（从预生成文档读取）",
      async () => ({
        content: [{
          type: "text",
          text: JSON.stringify(this.dataLoader.getSortedMessageTypes(), null, 2)
        }]
      })
    );
  }
}

/**
 * 主应用类
 */
class WfcMcpServer {
  private server: any;
  private dataLoader: DataLoader;
  private toolRegistry: ToolRegistry;
  private app: express.Application;
  private transports: Record<string, SSEServerTransport>;

  constructor() {
    this.server = new McpServer(
      { 
        name: CONFIG.SERVER_NAME, 
        version: CONFIG.SERVER_VERSION 
      },
      { 
        capabilities: { 
          tools: {} 
        } 
      }
    );
    
    this.dataLoader = new DataLoader();
    this.toolRegistry = new ToolRegistry(this.server, this.dataLoader);
    this.app = express();
    this.transports = {};
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置Express中间件
   */
  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS支持
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes(): void {
    // SSE连接端点
    this.app.get('/sse', async (req: Request, res: Response) => {
      try {
        const transport = new SSEServerTransport('/messages', res);
        this.transports[transport.sessionId] = transport;
        
        // 设置传输关闭处理
        transport.onclose = () => {
          delete this.transports[transport.sessionId];
          console.log(`🔌 SSE connection closed: ${transport.sessionId}`);
        };
        
        transport.onerror = (error: Error) => {
          console.error(`❌ SSE transport error: ${error.message}`);
          delete this.transports[transport.sessionId];
        };
        
        console.log(`🔌 New SSE connection established: ${transport.sessionId}`);
        await this.server.connect(transport);
        
      } catch (error) {
        console.error('❌ Failed to establish SSE connection:', error);
        res.status(500).send('Failed to establish SSE connection');
      }
    });

    // 消息处理端点
    this.app.post('/messages', async (req: Request, res: Response) => {
      try {
        const sessionId = req.query.sessionId as string;
        const transport = this.transports[sessionId];
        
        if (!transport) {
          res.status(400).send('No transport found for sessionId');
          return;
        }
        
        await transport.handlePostMessage(req, res, req.body);
        
      } catch (error) {
        console.error('❌ Failed to handle POST message:', error);
        res.status(500).send('Failed to handle message');
      }
    });

    // 健康检查端点
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        server: CONFIG.SERVER_NAME,
        version: CONFIG.SERVER_VERSION,
        activeConnections: Object.keys(this.transports).length
      });
    });

    // 根路径信息
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: CONFIG.SERVER_NAME,
        version: CONFIG.SERVER_VERSION,
        endpoints: {
          sse: '/sse',
          messages: '/messages',
          health: '/health'
        },
        activeConnections: Object.keys(this.transports).length
      });
    });
  }

  /**
   * 初始化服务器
   */
  async initialize(): Promise<void> {
    console.log(`🚀 Starting ${CONFIG.SERVER_NAME} v${CONFIG.SERVER_VERSION}`);
    
    // 加载数据
    this.dataLoader.loadAll();
    
    // 注册工具
    this.toolRegistry.registerAllTools();
    
    console.log("✅ Server initialized successfully");
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    try {
      await this.initialize();
      
      const port = process.env.PORT ? parseInt(process.env.PORT) : CONFIG.HTTP_PORT;
      
      this.app.listen(port, () => {
        console.log(`🌐 HTTP Server listening on port ${port}`);
        console.log(`📡 SSE endpoint: http://localhost:${port}/sse`);
        console.log(`📬 Messages endpoint: http://localhost:${port}/messages`);
        console.log(`❤️  Health check: http://localhost:${port}/health`);
        console.log("✅ WFC MCP Server is ready for connections");
      });
      
    } catch (error) {
      console.error("❌ Failed to start WFC MCP Server:", error);
      process.exit(1);
    }
  }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
  const server = new WfcMcpServer();
  await server.start();
}

// 启动应用
main().catch((error) => {
  console.error("❌ Unhandled error in main function:", error);
  process.exit(1);
});