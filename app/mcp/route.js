import { NextResponse } from 'next/server';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createServer } from '../../src/server.js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const CORS_HEADERS = [
  'Content-Type',
  'Authorization',
  'mcp-session-id',
  'mcp-protocol-version',
].join(', ');

/**
 * Extract an API key from the Authorization header.
 * Accepts: "Bearer <token>", "ApiKey <token>", or just "<token>".
 * If present, it overrides SUBSTACK_SESSION_TOKEN for this request.
 */
function extractApiKey(req) {
  const header = req.headers.get('authorization') || '';
  if (!header) return null;
  const match = header.match(/^(?:Bearer|ApiKey)\s+(.+)$/i);
  return match ? match[1].trim() : header.trim();
}

function checkConfig() {
  const required = ['SUBSTACK_PUBLICATION_URL', 'SUBSTACK_USER_ID'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length === 0) return null;
  return `Missing env vars: ${missing.join(', ')}`;
}

export async function POST(req) {
  // If an API key is sent via Authorization header, use it as the session token.
  // This lets Composio pass the credential per-request via API Key auth.
  // Falls back to SUBSTACK_SESSION_TOKEN env var if no header is sent.
  const apiKey = extractApiKey(req);
  if (apiKey) {
    process.env.SUBSTACK_SESSION_TOKEN = apiKey;
  }

  if (!process.env.SUBSTACK_SESSION_TOKEN) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32001, message: 'No session token: pass it via Authorization header or set SUBSTACK_SESSION_TOKEN env var.' }, id: null },
      { status: 401 }
    );
  }

  const err = checkConfig();
  if (err) {
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: err }, id: null },
      { status: 500 }
    );
  }

  try {
    const server = createServer();
    const transport = new WebStandardStreamableHTTPServerTransport();
    await server.connect(transport);
    return await transport.handleRequest(req);
  } catch (error) {
    console.error('MCP POST error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32603, message: error instanceof Error ? error.message : String(error) },
        id: null,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasToken = Boolean(process.env.SUBSTACK_SESSION_TOKEN);
  const err = checkConfig();
  return NextResponse.json({
    status: err ? 'misconfigured' : 'MCP endpoint active',
    version: '1.0.0',
    transport: 'Streamable HTTP (POST only)',
    tools: 27,
    auth: hasToken
      ? 'Session token configured (env var). Authorization header also accepted.'
      : 'No session token in env. Pass one via Authorization: Bearer <token> header.',
    ...(err ? { error: err } : {}),
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': CORS_HEADERS,
      'Access-Control-Expose-Headers': 'mcp-session-id',
      'Access-Control-Max-Age': '86400',
    },
  });
}
