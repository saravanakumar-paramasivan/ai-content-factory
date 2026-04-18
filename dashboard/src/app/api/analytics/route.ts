import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await brain.getAnalytics();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 502 });
  }
}
