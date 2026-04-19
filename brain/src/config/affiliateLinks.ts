// ─────────────────────────────────────────────────────────────────────────────
// AFFILIATE LINK REGISTRY
//
// HOW TO SET UP:
//   1. Sign up for each program (see docs/USER_GUIDE.md → Affiliate section)
//   2. Replace the placeholder URLs below with your real referral links
//   3. Set active: true for the ones you've joined
//   4. Restart the brain service
//
// Links are matched to videos by scanning the niche + video title for triggers.
// Matching links are appended to the YouTube description automatically.
// ─────────────────────────────────────────────────────────────────────────────

export interface AffiliateLink {
  id: string;
  name: string;
  platform: string;
  category: string;
  url: string;                // ← Replace with YOUR referral URL
  cta: string;                // Call-to-action shown in description
  commission: string;         // For your reference
  signupUrl: string;          // Where to join the affiliate program
  triggers: string[];         // Niche keywords that activate this link
  active: boolean;            // Set true once you have a real referral URL
}

export const AFFILIATE_LINKS: AffiliateLink[] = [

  // ── FINANCE ─────────────────────────────────────────────────────────────────

  {
    id: 'zerodha',
    name: 'Zerodha',
    platform: 'Stock Broker',
    category: 'Finance',
    url: 'https://zerodha.com/open-account?c=YOUR_CODE',   // ← your referral code
    cta: '📈 Open a FREE Zerodha account & start investing today',
    commission: '₹300 per account + 20% lifetime brokerage share',
    signupUrl: 'https://zerodha.com/partners',
    triggers: ['finance', 'invest', 'stock', 'market', 'sip', 'mutual fund', 'wealth', 'money', 'trading', 'nifty', 'sensex', 'portfolio', 'demat'],
    active: false,
  },
  {
    id: 'groww',
    name: 'Groww',
    platform: 'Investment App',
    category: 'Finance',
    url: 'https://groww.in/refer?referral=YOUR_CODE',       // ← your referral code
    cta: '💰 Start SIP investing for FREE with Groww',
    commission: '₹100–300 per new investor',
    signupUrl: 'https://groww.in/affiliates',
    triggers: ['sip', 'mutual fund', 'invest', 'finance', 'passive income', 'savings', 'fd', 'returns'],
    active: false,
  },
  {
    id: 'upstox',
    name: 'Upstox',
    platform: 'Stock Broker',
    category: 'Finance',
    url: 'https://upstox.com/open-account/?f=YOUR_CODE',   // ← your referral code
    cta: '🚀 Trade stocks at ₹20/order with Upstox',
    commission: '₹400 per account opened',
    signupUrl: 'https://upstox.com/partner-program',
    triggers: ['stock', 'trading', 'demat', 'broker', 'nifty', 'options', 'futures'],
    active: false,
  },

  // ── HEALTH & WELLNESS ────────────────────────────────────────────────────────

  {
    id: 'iherb',
    name: 'iHerb',
    platform: 'Supplements',
    category: 'Health',
    url: 'https://www.iherb.com/?rcode=YOUR_CODE',         // ← your referral code
    cta: '🌿 Shop supplements I trust — 5% off with my link',
    commission: '5% per sale, 30-day cookie',
    signupUrl: 'https://www.iherb.com/partner',
    triggers: ['health', 'supplement', 'vitamin', 'protein', 'weight loss', 'fitness', 'wellness', 'immunity', 'collagen', 'omega', 'probiotic', 'creatine'],
    active: false,
  },
  {
    id: 'healthkart',
    name: 'HealthKart',
    platform: 'Supplements India',
    category: 'Health',
    url: 'https://www.healthkart.com/?ref=YOUR_CODE',      // ← your referral code
    cta: '💪 Best Indian supplements — use my code for discount',
    commission: '5–12% per sale',
    signupUrl: 'https://www.healthkart.com/affiliate',
    triggers: ['protein', 'supplement', 'gym', 'fitness', 'muscle', 'weight', 'creatine', 'whey', 'bcaa'],
    active: false,
  },

  // ── COOKING & FOOD ───────────────────────────────────────────────────────────

  {
    id: 'amazon_kitchen',
    name: 'Amazon Kitchen',
    platform: 'Amazon Associates',
    category: 'Cooking',
    url: 'https://amzn.in/d/YOUR_PRODUCT_LINK',            // ← link to specific product
    cta: '🍳 Kitchen tools I use in this recipe (Amazon)',
    commission: '4–8% on purchases',
    signupUrl: 'https://affiliate-program.amazon.in',
    triggers: ['recipe', 'cooking', 'food', 'kitchen', 'sambar', 'biryani', 'curry', 'tamil', 'south indian', 'rasam', 'idli', 'dosa'],
    active: false,
  },
  {
    id: 'amazon_books',
    name: 'Amazon Books',
    platform: 'Amazon Associates',
    category: 'Education',
    url: 'https://amzn.in/d/YOUR_BOOKS_LINK',              // ← link to book list
    cta: '📚 Books I recommend on this topic',
    commission: '4% per book sold',
    signupUrl: 'https://affiliate-program.amazon.in',
    triggers: ['book', 'stoic', 'philosophy', 'read', 'learn', 'psychology', 'habit', 'mindset', 'self help'],
    active: false,
  },

  // ── TECH & AI ────────────────────────────────────────────────────────────────

  {
    id: 'hostinger',
    name: 'Hostinger',
    platform: 'Web Hosting',
    category: 'Tech',
    url: 'https://hostinger.in?REFERRALCODE=YOUR_CODE',    // ← your referral code
    cta: '🌐 Start your website for ₹69/month with Hostinger',
    commission: '60% per sale',
    signupUrl: 'https://www.hostinger.in/affiliates',
    triggers: ['website', 'business', 'startup', 'online', 'ecommerce', 'blog', 'tech', 'ai', 'entrepreneur'],
    active: false,
  },
  {
    id: 'coursera',
    name: 'Coursera',
    platform: 'Online Learning',
    category: 'Education',
    url: 'https://coursera.org?siteID=YOUR_CODE',          // ← your affiliate code
    cta: '🎓 Learn the skills that pay — Coursera free trial',
    commission: '45% per subscription',
    signupUrl: 'https://coursera.org/affiliates',
    triggers: ['learn', 'skill', 'career', 'job', 'ai', 'tech', 'python', 'data science', 'certificate', 'course'],
    active: false,
  },

  // ── KIDS & EDUCATION ─────────────────────────────────────────────────────────

  {
    id: 'amazon_kids',
    name: 'Amazon Kids Products',
    platform: 'Amazon Associates',
    category: 'Kids',
    url: 'https://amzn.in/d/YOUR_KIDS_LINK',               // ← link to kids products
    cta: '🧸 Best learning toys & books for kids (Amazon)',
    commission: '4–8% per purchase',
    signupUrl: 'https://affiliate-program.amazon.in',
    triggers: ['kids', 'children', 'story', 'tamil kids', 'baby', 'toddler', 'school', 'education', 'learn'],
    active: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility: find links relevant to a given niche + title
// ─────────────────────────────────────────────────────────────────────────────

export function findRelevantLinks(niche: string, title: string): AffiliateLink[] {
  const searchText = `${niche} ${title}`.toLowerCase();
  return AFFILIATE_LINKS.filter(
    link => link.active && link.triggers.some(trigger => searchText.includes(trigger))
  ).slice(0, 3); // max 3 links per video — keeps description clean
}
