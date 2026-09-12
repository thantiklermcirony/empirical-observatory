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
  title: 'The Empirical Observatory — The Night Office',
  description:
    'Take a seat in the night observatory. Ask a question, explore the laboratories, and follow real calculations and sourced observations into a traceable report.',
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
