import { notFound } from 'next/navigation';
import { brain } from '@/lib/brain';
import { ProjectDetailClient } from './ProjectDetailClient';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const project = await brain.getProject(params.id).catch(() => null);
  if (!project) notFound();
  return <ProjectDetailClient initialProject={project} />;
}
