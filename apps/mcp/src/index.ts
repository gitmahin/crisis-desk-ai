import { createMcpHandler , McpServer} from '@modelcontextprotocol/server';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from "@modelcontextprotocol/node"

import z4 from 'zod/v4';
import { baseConfig } from './config';
import { createServer } from 'node:http';



const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'notes', version: '1.0.0' });

    server.registerTool(
        'add-note',
        {
            description: 'Save a note',
            inputSchema: z4.object({ text: z4.string() })
        },
        async ({ text }) => ({ content: [{ type: 'text', text: `Saved: ${text}` }] })
    );

    return server;
});

const nodeHandler = toNodeHandler(handler);
const validateHost = localhostHostValidation();
const validateOrigin = localhostOriginValidation();

createServer((req, res) => {
    if (!validateHost(req, res) || !validateOrigin(req, res)) return;
    void nodeHandler(req, res);
}).listen(baseConfig.PORT, baseConfig.HOST, () => {
    console.error("Server is running on port: ", baseConfig.PORT)
});