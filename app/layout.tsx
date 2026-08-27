import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Folafemz Admin',
  description: 'Fleet, content and enquiry management for Folafemz Global NIG LTD.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
