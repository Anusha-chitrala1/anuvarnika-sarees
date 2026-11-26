import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import {
  buildMimeMessage,
  encodeBase64UrlUtf8,
  sendGmailEmail,
} from '../src/lib/gmail-mailer.js';
import type { Env } from '../src/types.js';

function loadDevVars(): Record<string, string> {
  const varsPath = resolve(process.cwd(), '.dev.vars');
  const out: Record<string, string> = {};
  if (!existsSync(varsPath)) return out;
  const content = readFileSync(varsPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

async function main() {
  // 1. Verify RFC 5322 MIME + Base64URL encoding
  const rawMime = buildMimeMessage({
    fromName: 'AnuVarnika Sarees',
    fromEmail: 'anuvarnika.sarees@gmail.com',
    to: 'anuvarnika.sarees@gmail.com',
    subject: 'AnuVarnika Gmail REST API Verification (₹14,999)',
    text: 'Verification test for AnuVarnika Sarees Gmail REST API mailer (₹14,999).',
    html: '<p>Verification test for <strong>AnuVarnika Sarees</strong> Gmail REST API mailer (<strong>₹14,999</strong>).</p>',
  });
  const base64Url = encodeBase64UrlUtf8(rawMime);
  assert.ok(rawMime.includes('\r\n'), 'MIME message must use CRLF line endings');
  assert.ok(!base64Url.includes('+') && !base64Url.includes('/') && !base64Url.endsWith('='), 'Base64URL must be URL-safe without padding');
  console.log('[test:email] MIME + Base64URL encoding check passed.');

  // 2. Send test email (uses Gmail REST API if GMAIL_REFRESH_TOKEN is configured, else dev console fallback)
  const devVars = loadDevVars();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN || devVars.GMAIL_REFRESH_TOKEN || '';
  const senderEmail =
    process.env.GMAIL_SENDER_EMAIL || devVars.GMAIL_SENDER_EMAIL || 'anuvarnika.sarees@gmail.com';
  const recipient = process.env.TEST_EMAIL_TO || senderEmail;

  const env: Env = {
    DB: {} as D1Database,
    ENVIRONMENT: refreshToken ? 'production' : 'development',
    STORE_NAME: 'AnuVarnika Sarees',
    ADMIN_EMAIL: senderEmail,
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID || devVars.GMAIL_CLIENT_ID || '',
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET || devVars.GMAIL_CLIENT_SECRET || '',
    GMAIL_REFRESH_TOKEN: refreshToken,
    GMAIL_SENDER_EMAIL: senderEmail,
    GMAIL_SENDER_NAME: process.env.GMAIL_SENDER_NAME || devVars.GMAIL_SENDER_NAME || 'AnuVarnika Sarees',
  };

  const result = await sendGmailEmail(env, {
    to: recipient,
    subject: 'AnuVarnika Sarees — Gmail REST API Test Email (₹0 Domain Cost)',
    text: 'Namaste! This is a test email from the AnuVarnika Sarees Cloudflare Worker Gmail REST API mailer.',
    html: '<div style="font-family: sans-serif; padding: 16px; background: #FAF5EB; border: 1px solid #EADBCC;"><h2 style="color: #7A231E;">AnuVarnika Sarees</h2><p>Namaste! Your zero-SDK <strong>Gmail REST API</strong> mailer is working cleanly.</p></div>',
  });

  console.log('[test:email] Send result:', result);
}

main().catch((err) => {
  console.error('[test:email] Failed:', err);
  process.exit(1);
});
