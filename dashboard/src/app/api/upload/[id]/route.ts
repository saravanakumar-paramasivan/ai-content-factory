import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await brain.uploadProject(params.id);
    return NextResponse.json(result);
  } catch (err) {
    const message = String(err);
    const status = message.includes('not ready') ? 409 : message.includes('not found') ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
