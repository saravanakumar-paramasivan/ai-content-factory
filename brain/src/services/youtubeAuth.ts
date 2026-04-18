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
  const secretPath = path.resolve(__dirname, '../../oauth_client_secret.json');
  const raw = fs.readFileSync(secretPath, 'utf-8');
  return JSON.parse(raw);
}

function createOAuth2Client() {
  const { web } = loadSecret();
  return new google.auth.OAuth2(
    web.client_id,
    web.client_secret,
    web.redirect_uris[0]
  );
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
