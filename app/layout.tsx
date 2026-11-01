import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/dm-sans/300.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentPurse | A PayPal wallet for your AI agents',
  description:
    'Give every AI agent its own PayPal budget, spend rules and an approval line to you. Small buys go through. Risky ones wait for your yes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
