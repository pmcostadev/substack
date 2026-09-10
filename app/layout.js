import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

const SITE = 'https://substack.pmcosta.dev';
const TITLE = 'Substack MCP Server';
const TAGLINE = '27 tools, session cookie auth';
const DESCRIPTION = 'An MCP server that gives an AI assistant full access to a Substack publication: drafts, publish, subscribers, analytics, tags, comments, Notes, reader feed, and more. Deployed on Vercel with Streamable HTTP transport.';

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: `${TITLE} — ${TAGLINE}`, template: `%s — ${TITLE}` },
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [{ name: 'Pedro Costa', url: 'https://pmcosta.dev' }],
  creator: 'Pedro Costa',
  publisher: 'Pedro Costa',
  keywords: ['MCP', 'Model Context Protocol', 'MCP server', 'Substack', 'newsletter', 'AI agent', 'Claude', 'Vercel', 'Streamable HTTP'],
  category: 'technology',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: TITLE,
    title: `${TITLE} — ${TAGLINE}`,
    description: DESCRIPTION,
    locale: 'en_US',
    images: [{ url: '/brand/og-default.png', width: 1200, height: 630, alt: 'pmcosta.dev — Coimbra across the Mondego at dusk' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} — ${TAGLINE}`,
    description: DESCRIPTION,
    creator: '@pmcostadev',
    images: ['/brand/og-default.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/logo-96.png', type: 'image/png', sizes: '96x96' },
      { url: '/brand/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/brand/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
};

export const viewport = { themeColor: '#121011', colorScheme: 'dark' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
