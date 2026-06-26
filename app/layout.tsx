import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StayBuddy POS — Subscription Manager',
  description: 'Manage POS app subscriptions and activation codes',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
