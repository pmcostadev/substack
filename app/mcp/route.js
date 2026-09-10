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

function envError() {
  const required = ['SUBSTACK_PUBLICATION_URL', 'SUBSTACK_SESSION_TOKEN', 'SUBSTACK_USER_ID'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length === 0) return null;
  return `Missing env vars: ${missing.join(', ')}`;
}

export async function POST(req) {
  const err = envError();
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
  const err = envError();
  return NextResponse.json({
    status: err ? 'misconfigured' : 'MCP endpoint active',
    version: '1.0.0',
    transport: 'Streamable HTTP (POST only)',
    tools: 27,
    auth: 'Server-side session cookie (env vars). No client auth required.',
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
