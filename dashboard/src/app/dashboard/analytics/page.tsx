import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';
import { AnalyticsClient } from './AnalyticsClient';

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  let initial;
  try {
    initial = await brain.getAnalytics();
  } catch {
    initial = {
      period: { month: '', label: 'Analytics unavailable' },
      projects: { total: 0, by_status: {}, by_month: [] },
      apis: {
        anthropic: {
          model: 'claude-sonnet-4-6',
          scripting_attempts: 0,
          estimated_input_tokens: 0,
          estimated_output_tokens: 0,
          estimated_cost_usd: 0,
          billing_type: 'pay-as-you-go',
          billing_url: 'https://console.anthropic.com',
          renewal: '',
          impact: '',
        },
        elevenlabs: { available: false },
        pexels: {
          available: false,
          clips_downloaded: 0,
          requests_estimated: 0,
          plan_limit_monthly: 20000,
          renewal: '',
          impact: '',
          billing_url: 'https://www.pexels.com/api/',
        },
      },
      youtube: { connected: false, videos_uploaded: 0, videos: [], totals: { views: 0, likes: 0, comments: 0 } },
    };
  }

  return <AnalyticsClient initial={initial} />;
}
