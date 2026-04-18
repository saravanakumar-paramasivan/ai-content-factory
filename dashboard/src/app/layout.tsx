import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'AI Content Factory',
  description: 'Automated YouTube Shorts production dashboard',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(240 10% 6%)',
              border: '1px solid hsl(240 3.7% 15.9%)',
              color: 'hsl(0 0% 98%)',
            },
          }}
        />
      </body>
    </html>
  );
}
