import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const project = await brain.getProject(params.id);
    return NextResponse.json(project);
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
}
