import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || 'tamil_food';
  const region   = searchParams.get('region')   || 'IN';
  const refresh  = searchParams.get('refresh') === 'true';

  try {
    const data = await brain.getTrending(category, region, refresh);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch trending topics' }, { status: 502 });
  }
}
