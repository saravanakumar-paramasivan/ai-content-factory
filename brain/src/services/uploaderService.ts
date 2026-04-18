import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { getStoredTokens } from './tokenStore';
import { generateVideoMetadata } from './metadataGenerator';

function createAuthorizedClient() {
  const secretPath = path.resolve(__dirname, '../../oauth_client_secret.json');
  const { web } = JSON.parse(fs.readFileSync(secretPath, 'utf-8'));
  const auth = new google.auth.OAuth2(web.client_id, web.client_secret, web.redirect_uris[0]);
  return auth;
}

export interface UploadResult {
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string;
  description: string;
  tags: string[];
}

export async function uploadToYouTube(
  projectId: string,
  videoPath: string,
  niche: string,
  scriptData: Record<string, unknown>
): Promise<UploadResult> {
  console.log(`[Uploader] Starting upload for project ${projectId}`);

  // --- 1. Check tokens ---
  const tokens = await getStoredTokens();
  if (!tokens) {
    throw new Error('No YouTube OAuth tokens found. Visit /auth/youtube to authorize.');
  }

  const auth = createAuthorizedClient();
  auth.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: tokens.expiryDate ?? undefined,
    token_type: tokens.tokenType ?? undefined,
    scope: tokens.scope ?? undefined,
  });

  // Auto-refresh token if expired
  if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
    console.log('[Uploader] Token expired — refreshing...');
    const { credentials } = await auth.refreshAccessToken();
    auth.setCredentials(credentials);
  }

  // --- 2. Generate LLM metadata ---
  const metadata = await generateVideoMetadata(niche, scriptData as any);

  // --- 3. Upload to YouTube ---
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`);
  }

  const youtube = google.youtube({ version: 'v3', auth });
  const fileSize = fs.statSync(videoPath).size;
  console.log(`[Uploader] Uploading ${(fileSize / 1024 / 1024).toFixed(1)}MB to YouTube...`);

  const response = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: '22', // People & Blogs — common for Shorts
        defaultLanguage: 'en',
      },
      status: {
        privacyStatus: 'private', // always private first — manual review before publishing
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      mimeType: 'video/mp4',
      body: fs.createReadStream(videoPath),
    },
  });

  const videoId = response.data.id!;
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

  console.log(`[Uploader] Upload complete: ${youtubeUrl}`);
  return {
    youtubeVideoId: videoId,
    youtubeUrl,
    title: metadata.title,
    description: metadata.description,
    tags: metadata.tags,
  };
}
