import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

interface OAuthSecret {
  web: {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    auth_uri: string;
    token_uri: string;
  };
}

function loadSecret(): OAuthSecret {
  // Cloud/Railway: set the full JSON as GOOGLE_OAUTH_CLIENT_SECRET_JSON env var
  if (process.env.GOOGLE_OAUTH_CLIENT_SECRET_JSON) {
    return JSON.parse(process.env.GOOGLE_OAUTH_CLIENT_SECRET_JSON);
  }
  const secretPath = path.resolve(__dirname, '../../oauth_client_secret.json');
  return JSON.parse(fs.readFileSync(secretPath, 'utf-8'));
}

export function createOAuth2Client() {
  const { web } = loadSecret();
  // GOOGLE_OAUTH_REDIRECT_URI overrides the file — needed when deploying to Railway
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? web.redirect_uris[0];
  return new google.auth.OAuth2(web.client_id, web.client_secret, redirectUri);
}

const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
];

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: YOUTUBE_SCOPES,
    prompt: 'consent',
  });
}

export async function handleCallback(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  return tokens;
}
