import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";

import { baseConfig } from "./config";
import { createServer } from "node:http";
import { ReportTools } from "./tools";
import { ReportResources } from "./resources";
import { mongoConnect } from "./lib";
import { connectRedis } from "./lib/redis";

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "notes", version: "1.0.0" });

  // Register tools
  new ReportTools(server).init();

  // Register resources
  new ReportResources(server).init();

  return server;
});

const nodeHandler = toNodeHandler(handler);

createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    await mongoConnect();
    await connectRedis();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  void nodeHandler(req, res);
}).listen(baseConfig.PORT, baseConfig.HOST, () => {
  console.error("Server is running on port: ", baseConfig.PORT);
});
