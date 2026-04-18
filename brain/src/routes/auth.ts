import { Router } from 'express';
import { getAuthUrl } from '../services/youtubeAuth';

export const authRouter = Router();

authRouter.get('/youtube', (_req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});
