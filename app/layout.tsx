import type { Metadata } from 'next';
import { Inter, Playfair_Display, JetBrains_Mono, Nosifer } from 'next/font/google';
import './globals.css';
import GlobalTouchGlow from '@/components/GlobalTouchGlow';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });
const nosifer = Nosifer({ weight: '400', subsets: ['latin'], variable: '--font-nosifer' });

export const metadata: Metadata = {
  title: 'Night Has Come',
  description: 'Trust no one. Survive the night.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable} ${nosifer.variable}`}>
      <body className="font-sans antialiased bg-black text-white selection:bg-blue-500/30">
        <GlobalTouchGlow />
        {children}
      </body>
    </html>
  );
}
