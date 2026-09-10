export const metadata = {
  title: 'Substack MCP',
  description: 'MCP server for Substack',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
