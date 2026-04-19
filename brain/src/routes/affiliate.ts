import { Router, Request, Response } from 'express';
import { AFFILIATE_LINKS, findRelevantLinks } from '../config/affiliateLinks';

export const affiliateRouter = Router();

// GET /affiliate — list all configured links with status
affiliateRouter.get('/', (_req: Request, res: Response) => {
  const activeCount = AFFILIATE_LINKS.filter(l => l.active).length;
  return res.json({
    total: AFFILIATE_LINKS.length,
    active: activeCount,
    inactive: AFFILIATE_LINKS.length - activeCount,
    links: AFFILIATE_LINKS.map(l => ({
      id: l.id,
      name: l.name,
      platform: l.platform,
      category: l.category,
      cta: l.cta,
      commission: l.commission,
      signupUrl: l.signupUrl,
      triggers: l.triggers,
      active: l.active,
      // Mask real URL in API — only show whether it's a placeholder
      configured: !l.url.includes('YOUR_'),
    })),
  });
});

// GET /affiliate/preview?niche=xxx&title=yyy — preview which links fire for a given niche
affiliateRouter.get('/preview', (req: Request, res: Response) => {
  const niche = (req.query.niche as string) || '';
  const title = (req.query.title as string) || '';
  const matched = findRelevantLinks(niche, title);
  return res.json({
    niche,
    title,
    matched_count: matched.length,
    links: matched.map(l => ({
      name: l.name,
      cta: l.cta,
      configured: !l.url.includes('YOUR_'),
    })),
  });
});
