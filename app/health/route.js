import { NextResponse } from 'next/server';

export async function GET() {
  const required = ['SUBSTACK_PUBLICATION_URL', 'SUBSTACK_SESSION_TOKEN', 'SUBSTACK_USER_ID'];
  const missing = required.filter((name) => !process.env[name]);

  return NextResponse.json({
    status: missing.length === 0 ? 'ok' : 'misconfigured',
    ...(missing.length > 0 ? { missing_env: missing } : {}),
  });
}
