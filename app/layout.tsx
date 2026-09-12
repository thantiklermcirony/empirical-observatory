/* oxlint-disable next/no-html-link-for-pages -- Native navigation avoids the reproduced vinext production Link runtime failure. */
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import InterestCounter from '@/components/observatory/InterestCounter';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'The Empirical Observatory — Question Desk',
  description:
    'Step into an old observatory. Turn a question into an inspectable model, run reproducible checks and see what a change of perspective reveals.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <InterestCounter />
        <footer
          style={{ padding: '12px 24px', fontSize: 12, textAlign: 'center' }}
        >
          <a href="/privacy">Records and usage counts</a>
        </footer>
      </body>
    </html>
  );
}
