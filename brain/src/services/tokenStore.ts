import { prisma } from '../lib/db';
import type { Credentials } from 'google-auth-library';

export async function saveTokens(tokens: Credentials): Promise<void> {
  const data = {
    accessToken: tokens.access_token!,
    refreshToken: tokens.refresh_token ?? null,
    scope: tokens.scope ?? null,
    tokenType: tokens.token_type ?? null,
    expiryDate: tokens.expiry_date != null ? BigInt(tokens.expiry_date) : null,
  };

  await prisma.youtubeToken.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });
}

export async function getStoredTokens() {
  const row = await prisma.youtubeToken.findUnique({ where: { id: 1 } });
  if (!row) return null;
  return {
    ...row,
    expiryDate: row.expiryDate != null ? Number(row.expiryDate) : null,
  };
}
