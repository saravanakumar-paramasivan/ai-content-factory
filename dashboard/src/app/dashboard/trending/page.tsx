import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { brain } from '@/lib/brain';
import { TrendingClient } from './TrendingClient';

export default async function TrendingPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  let initial;
  try {
    initial = await brain.getTrending('tamil_food', 'IN');
  } catch {
    // Fallback shell so the page renders even if brain is down
    initial = {
      category: 'tamil_food',
      category_label: 'Tamil Food & Recipes',
      region: 'IN',
      topics: [],
      categories: [
        { id: 'tamil_food',       label: 'Tamil Food & Recipes',         region_hint: 'Tamil Nadu, India', emoji: '🍛' },
        { id: 'tamil_kids',       label: 'Tamil Kids Stories',           region_hint: 'Tamil Nadu, India', emoji: '👦' },
        { id: 'indian_finance',   label: 'Indian Finance & Money',       region_hint: 'India',             emoji: '💰' },
        { id: 'health_wellness',  label: 'Health & Wellness',            region_hint: 'Global',            emoji: '🧘' },
        { id: 'tech_ai',          label: 'Tech & AI',                    region_hint: 'Global',            emoji: '🤖' },
        { id: 'motivation',       label: 'Motivation & Self-Help',       region_hint: 'Global',            emoji: '🔥' },
        { id: 'cooking_hacks',    label: 'Cooking & Kitchen Hacks',      region_hint: 'Global',            emoji: '🍳' },
        { id: 'kids_education',   label: 'Kids Education',               region_hint: 'Global',            emoji: '📚' },
        { id: 'travel_culture',   label: 'Travel & Culture',             region_hint: 'India',             emoji: '✈️'  },
        { id: 'beauty_skincare',  label: 'Beauty & Skincare',            region_hint: 'Global',            emoji: '💅' },
        { id: 'fitness_workout',  label: 'Fitness & Workout',            region_hint: 'Global',            emoji: '💪' },
        { id: 'business_startup', label: 'Business & Entrepreneurship',  region_hint: 'India',             emoji: '🚀' },
      ],
      generated_at: new Date().toISOString(),
      cached: false,
    };
  }

  return <TrendingClient initialData={initial} />;
}
