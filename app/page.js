export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: '600px' }}>
      <h1>Substack MCP</h1>
      <p>
        MCP server for Substack with 27 tools: drafts, publish, subscribers,
        analytics, Notes, comments, and reader.
      </p>
      <p>
        <strong>MCP endpoint:</strong>{' '}
        <code>/mcp</code> (POST, Streamable HTTP)
      </p>
      <p style={{ fontSize: '0.85rem', color: '#666' }}>
        Based on{' '}
        <a href="https://github.com/marcomoauro/substack-mcp">marcomoauro/substack-mcp</a>{' '}
        (MIT). Rewired for Vercel deployment.
      </p>
    </main>
  );
}
