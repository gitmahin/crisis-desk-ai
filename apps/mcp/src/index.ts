import { createMcpHandler, hostHeaderValidationResponse, McpServer, originValidationResponse } from "@modelcontextprotocol/server";
import {
  localhostHostValidation,
  localhostOriginValidation,
  toNodeHandler,
} from "@modelcontextprotocol/node";
import {
  hostHeaderValidation,
  originValidation,
} from "@modelcontextprotocol/node";
import z4 from "zod/v4";
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

// const rawAlbHost = process.env.ALLOWED_AWS_ALB_HOST ?? "";
// const cleanAlbHost = rawAlbHost.replace(/^https?:\/\//, "").split(":")[0];

// const allowedHosts = [
//   "localhost",
//   "127.0.0.1",
//   "0.0.0.0",
//   cleanAlbHost,
// ].filter((host): host is string => Boolean(host && host.trim().length > 0));

const nodeHandler = toNodeHandler(handler);

createServer( async (req, res) => {

  if (req.url === "/health" && req.method === "GET") {
    await mongoConnect()
    await connectRedis()
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // const protocol = req.headers["x-forwarded-proto"] || "http";
  // const fullUrl = `${protocol}://${req.headers.host || "localhost"}${req.url}`;
  
  // const webRequest = new Request(fullUrl, {
  //   method: req.method,
  //   headers: req.headers as Record<string, string>,
  // });

  // const rejected =
  //   hostHeaderValidationResponse(webRequest, allowedHosts) ??
  //   originValidationResponse(webRequest, allowedHosts);

  // if (rejected) {
  //   res.writeHead(rejected.status, Object.fromEntries(rejected.headers.entries()));
  //   const body = await rejected.text();
  //   res.end(body);
  //   return;
  // }

  void nodeHandler(req, res);
}).listen(baseConfig.PORT, baseConfig.HOST, () => {
  console.error("Server is running on port: ", baseConfig.PORT);
});
