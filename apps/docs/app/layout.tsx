import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'slop-detect docs',
  description: 'Documentation for slop-detect.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-[var(--border)] px-6 py-4">
          <p className="text-sm text-[var(--muted)]">slop-detect docs</p>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
