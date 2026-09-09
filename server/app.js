import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

import { getData, saveData } from '../src/lib/data.js';
import { createMcpServer } from './mcp.js';

// Express app serving the data API and the MCP endpoint. Exported without
// listening so tests can bind it to an ephemeral port.
export function createApp({ token }) {
  if (!token) throw new Error('createApp: token is required');

  const app = express();

  app.get('/healthz', (req, res) => res.json({ ok: true }));

  app.use((req, res, next) => {
    if (req.get('authorization') === `Bearer ${token}`) return next();
    res.status(401).json({ error: 'unauthorized' });
  });

  app.use(express.json({ limit: '5mb' }));

  app.get('/api/data', (req, res) => res.json(getData()));

  app.put('/api/data', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'body must be a data object' });
    }
    saveData(body);
    res.json({ ok: true });
  });

  app.all('/mcp', async (req, res) => {
    // Stateless mode: a fresh server + transport per request, per SDK guidance.
    const mcp = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => {
      transport.close();
      mcp.close();
    });
    await mcp.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  return app;
}
