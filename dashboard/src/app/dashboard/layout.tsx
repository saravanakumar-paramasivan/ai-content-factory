import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';
import { Navbar } from '@/components/Navbar';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const youtubeStatus = await brain.getYouTubeStatus().catch(() => null);

  return (
    <div className="min-h-screen bg-background">
      <Navbar youtubeStatus={youtubeStatus} />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
