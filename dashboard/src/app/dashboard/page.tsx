import { brain } from '@/lib/brain';
import { DashboardClient } from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const projects = await brain.getProjects().catch(() => []);
  return <DashboardClient initialProjects={projects} />;
}
