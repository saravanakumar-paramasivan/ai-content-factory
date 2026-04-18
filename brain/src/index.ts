import express from 'express';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { projectsRouter } from './routes/projects';
import { uploadRouter } from './routes/upload';
import { handleCallback } from './services/youtubeAuth';
import { saveTokens, getStoredTokens } from './services/tokenStore';
import { startVideoWorker } from './workers/videoWorker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

startVideoWorker();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'brain' });
});

app.use('/auth', authRouter);
app.use('/projects', projectsRouter);
app.use('/upload', uploadRouter);

app.get('/oauth2callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).json({ error: String(error) });
  }
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    const tokens = await handleCallback(code);
    await saveTokens(tokens);
    res.json({ success: true, message: 'YouTube tokens saved to database.' });
  } catch (err) {
    res.status(500).json({ error: 'OAuth callback failed', details: String(err) });
  }
});

app.get('/auth/status', async (_req, res) => {
  const tokens = await getStoredTokens();
  if (!tokens) {
    return res.json({ connected: false });
  }
  const expired = tokens.expiryDate != null && tokens.expiryDate < Date.now();
  res.json({
    connected: true,
    expired,
    scope: tokens.scope,
    expiryDate: tokens.expiryDate,
  });
});

app.listen(PORT, () => {
  console.log(`Brain service running on http://localhost:${PORT}`);
});
