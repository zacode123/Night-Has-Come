import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Night Has Come',
  description: 'A cinematic multiplayer survival Mafia game',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} dark`}>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500/30" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
