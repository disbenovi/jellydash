import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Reconstructed (upstream ships app/db gitignored). See overrides/README.md.

const SECRET_FILE = path.join(process.cwd(), 'app', 'db', 'webhook-secret.json');

function readSecret(): string | null {
  try {
    if (fs.existsSync(SECRET_FILE)) {
      const data = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf-8')) as { secret?: string };
      if (data && typeof data.secret === 'string') {
        return data.secret;
      }
    }
  } catch (error) {
    console.error('Error reading webhook-secret.json:', error);
  }
  return null;
}

export function getOrCreateWebhookSecret(): string {
  const existing = readSecret();
  if (existing) {
    return existing;
  }

  const secret = crypto.randomBytes(32).toString('hex');
  const dir = path.dirname(SECRET_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SECRET_FILE, JSON.stringify({ secret }, null, 2));
  return secret;
}

export function isValidWebhookSecret(secret: string | null): boolean {
  if (!secret) {
    return false;
  }
  return secret === getOrCreateWebhookSecret();
}