import type { Metadata } from 'next';
import { Noto_Sans } from 'next/font/google';
import './globals.css';
import NumberScrollGuard from '@/components/ui/number-scroll-guard';
import TopProgressBar from '@/components/ui/top-progress-bar';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SwrProvider } from '@/lib/storefront/swr';

const notoSans = Noto_Sans({
  variable: '--font-noto-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Inventory - Modern SaaS Application',
  description: 'Universal inventory managment system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSans.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'light';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body
        className={`font-sans antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider>
          <SwrProvider>
            <TopProgressBar />
            <NumberScrollGuard />
            {children}
          </SwrProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
