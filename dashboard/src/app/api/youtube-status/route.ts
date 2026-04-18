import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const status = await brain.getYouTubeStatus();
    return NextResponse.json(status);
  } catch {
    return NextResponse.json({ connected: false }, { status: 200 });
  }
}
