const REPO = 'https://github.com/pmcostadev/substack';
const UPSTREAM = 'https://github.com/marcomoauro/substack-mcp';
const ENDPOINT = 'https://substack.pmcosta.dev/mcp';

export default function Home() {
  return (
    <>
      <div className="shell">
        <section className="hero">
          <span className="label">Model Context Protocol server</span>
          <h1 className="display-xl">
            Substack<br />
            from an<br />
            AI agent
          </h1>
          <p className="lede">
            Gives an AI assistant full access to a Substack publication: drafts,
            publish, subscribers, analytics, tags, comments, Notes, and the reader
            feed. Session cookie auth, deployed on Vercel.
          </p>
          <div className="chips">
            <span className="chip label-sm">27 tools</span>
            <span className="chip label-sm">Streamable HTTP</span>
            <span className="chip label-sm">No client auth</span>
            <span className="chip label-sm">Vercel</span>
          </div>
        </section>

        <section className="section">
          <div className="section-label label">
            <span>01 &mdash; Connect a client</span>
            <span className="rule" />
          </div>
          <p className="body" style={{ marginBottom: 24 }}>
            Point any MCP client at this endpoint. No authentication needed on the
            client side: credentials live server-side in environment variables.
          </p>
          <code className="code-block">{ENDPOINT}</code>
        </section>

        <section className="section">
          <div className="section-label label">
            <span>02 &mdash; What it does</span>
            <span className="rule" />
          </div>
          <div className="grid grid-3">
            <article className="card">
              <h3 className="title-sm">Write</h3>
              <p className="body">
                Create drafts, set structured post bodies with headings, lists,
                code blocks, images and paywalls. Update metadata, publish with
                email control, upload images.
              </p>
            </article>
            <article className="card">
              <h3 className="title-sm">Measure</h3>
              <p className="body">
                Headline stats, 16 analytics reports, per-post metrics across 43
                fields, subscriber filtering with 48 columns and 18 operators,
                full CSV export.
              </p>
            </article>
            <article className="card">
              <h3 className="title-sm">Read</h3>
              <p className="body">
                Your inbox, the Notes feed, any post in full from any publication,
                comment threads, profile feeds, subscriptions, tags, and restacks.
              </p>
            </article>
          </div>
        </section>

        <section className="section">
          <div className="section-label label">
            <span>03 &mdash; Specification</span>
            <span className="rule" />
          </div>
          <table className="specs">
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>27</td>
                <td>Tools: drafts, publish, subscribers, analytics, tags, comments, Notes, reader, images, restacks</td>
              </tr>
              <tr>
                <td>Cookie</td>
                <td>Server-side session cookie auth. No client credentials needed.</td>
              </tr>
              <tr>
                <td>Streamable</td>
                <td>MCP transport over HTTP, stateless, no persistent process</td>
              </tr>
              <tr>
                <td>48</td>
                <td>Subscriber columns: filter, sort, search, and export with 18 operators</td>
              </tr>
              <tr>
                <td>16</td>
                <td>Analytics reports: retention, churn, growth, referrals, ARR, overlap, and more</td>
              </tr>
              <tr>
                <td>MIT</td>
                <td>Based on <a href={UPSTREAM}>marcomoauro/substack-mcp</a>, rewired for Vercel</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <div className="shell">
        <div className="cta">
          <div className="cta-inner">
            <div className="icon-tile" aria-hidden="true">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter">
                <path d="m18 16 4-4-4-4" />
                <path d="m6 8-4 4 4 4" />
                <path d="m14.5 4-5 16" />
              </svg>
            </div>
            <span className="label">MIT License</span>
            <h2 className="display-md">Read it, fork it, deploy your own</h2>
            <a className="btn btn-on-primary" href={REPO}>View the source</a>
          </div>
        </div>

        <footer className="foot label-sm">
          <a href={REPO}>GitHub</a>
          <a href={UPSTREAM}>Upstream</a>
          <a href="https://pmcosta.dev">pmcosta.dev</a>
        </footer>
      </div>
    </>
  );
}
