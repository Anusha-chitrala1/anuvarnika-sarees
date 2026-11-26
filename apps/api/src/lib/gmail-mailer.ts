import type { Env } from '../types.js';

export interface GmailEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface GmailSendResult {
  ok: boolean;
  mode: 'gmail-api' | 'workers-email' | 'dev-console';
  messageId?: string;
}

interface CachedAccessToken {
  token: string;
  expiresAtMs: number;
  cacheKey: string;
}

let cachedAccessToken: CachedAccessToken | null = null;

/**
 * Clear the in-memory Gmail OAuth2 access token cache (primarily for tests or 401 retry).
 */
export function clearGmailTokenCache(): void {
  cachedAccessToken = null;
}

/**
 * Encode a UTF-8 string into standard Base64 using Web APIs only (zero Node Buffer).
 */
export function encodeBase64Utf8(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Encode a UTF-8 string into URL-safe Base64URL (`+` -> `-`, `/` -> `_`, no trailing `=`).
 */
export function encodeBase64UrlUtf8(input: string): string {
  return encodeBase64Utf8(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Wrap a Base64 string into 76-character CRLF lines per RFC 5322 / RFC 2045.
 */
function wrapBase64Lines(base64: string): string {
  return base64.replace(/.{1,76}/g, '$&\r\n').replace(/\r\n$/, '');
}

/**
 * Encode a header value with RFC 2047 UTF-8 Base64 encoding when non-ASCII chars are present
 * (so symbols like `₹` and regional saree names render cleanly across all mail clients).
 */
export function encodeRfc2047Subject(subject: string): string {
  const sanitized = subject.replace(/[\r\n]+/g, ' ').trim();
  if (/^[\x20-\x7E]*$/.test(sanitized)) {
    return sanitized;
  }
  return `=?UTF-8?B?${encodeBase64Utf8(sanitized)}?=`;
}

function sanitizeHeaderValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function formatFromHeader(senderName: string, senderEmail: string): string {
  const cleanEmail = sanitizeHeaderValue(senderEmail);
  const cleanName = sanitizeHeaderValue(senderName).replace(/"/g, '\\"');
  if (/^[\x20-\x7E]*$/.test(cleanName)) {
    return `"${cleanName}" <${cleanEmail}>`;
  }
  return `=?UTF-8?B?${encodeBase64Utf8(cleanName)}?= <${cleanEmail}>`;
}

export interface BuildMimeParams {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Build a valid RFC 5322 `multipart/alternative` MIME message with CRLF (`\r\n`) endings.
 */
export function buildMimeMessage(params: BuildMimeParams): string {
  const boundary = `anuvarnika_${crypto.randomUUID().replace(/-/g, '')}`;
  const fromHeader = formatFromHeader(params.fromName, params.fromEmail);
  const toHeader = sanitizeHeaderValue(params.to);
  const subjectHeader = encodeRfc2047Subject(params.subject);

  const textBase64 = wrapBase64Lines(encodeBase64Utf8(params.text));
  const htmlBase64 = wrapBase64Lines(encodeBase64Utf8(params.html));

  const lines = [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${subjectHeader}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    textBase64,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    htmlBase64,
    '',
    `--${boundary}--`,
    '',
  ];

  return lines.join('\r\n');
}

/**
 * Exchange `GMAIL_REFRESH_TOKEN` for a short-lived Google OAuth2 access token and cache it
 * in-memory per Worker isolate until ~60 seconds before `expires_in`.
 */
export async function getGmailAccessToken(env: Env): Promise<string> {
  const clientId = env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = env.GMAIL_REFRESH_TOKEN?.trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail OAuth credentials are incomplete. Ensure GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN are configured.',
    );
  }

  const cacheKey = `${clientId}:${refreshToken.slice(-8)}`;
  const now = Date.now();
  if (
    cachedAccessToken &&
    cachedAccessToken.cacheKey === cacheKey &&
    cachedAccessToken.expiresAtMs > now
  ) {
    return cachedAccessToken.token;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !payload.access_token) {
    if (payload.error === 'invalid_grant') {
      console.error(
        '[GmailMailer] OAuth2 refresh token rejected (invalid_grant). Regenerate GMAIL_REFRESH_TOKEN in Google OAuth Playground and ensure the Google Cloud OAuth Consent Screen is published "In Production" so tokens do not expire after 7 days.',
        payload.error_description ?? '',
      );
    } else {
      console.error('[GmailMailer] OAuth2 token exchange failed:', {
        status: response.status,
        error: payload.error,
        description: payload.error_description,
      });
    }
    throw new Error(
      `Gmail OAuth2 token exchange failed (${payload.error ?? response.status}): ${payload.error_description ?? 'Unknown error'}`,
    );
  }

  const expiresInSec = typeof payload.expires_in === 'number' ? payload.expires_in : 3600;
  // Refresh 60s before expiry (or half-life if shorter)
  const ttlMs = Math.max(expiresInSec - 60, Math.floor(expiresInSec / 2), 5) * 1000;

  cachedAccessToken = {
    token: payload.access_token,
    expiresAtMs: now + ttlMs,
    cacheKey,
  };

  return payload.access_token;
}

function getSenderInfo(env: Env): { senderEmail: string; senderName: string } {
  const senderEmail =
    env.GMAIL_SENDER_EMAIL?.trim() || env.ADMIN_EMAIL?.trim() || 'anuvarnika.sarees@gmail.com';
  const senderName =
    env.GMAIL_SENDER_NAME?.trim() || env.STORE_NAME?.trim() || 'AnuVarnika Sarees';
  return { senderEmail, senderName };
}

/**
 * Send a transactional email via the Gmail REST API (`users.messages.send`).
 * In local `development` when `GMAIL_REFRESH_TOKEN` is missing/empty, logs cleanly to console instead of failing.
 */
export async function sendGmailEmail(
  env: Env,
  options: GmailEmailOptions,
): Promise<GmailSendResult> {
  const environment = env.ENVIRONMENT?.trim() || 'development';
  const refreshToken = env.GMAIL_REFRESH_TOKEN?.trim();

  if (environment === 'development' && !refreshToken) {
    const preview = options.text.replace(/\s+/g, ' ').trim().slice(0, 240);
    console.log(
      `[GmailMailer DEV] To: ${options.to} | Subject: ${options.subject} | Summary: ${preview}`,
    );
    return { ok: true, mode: 'dev-console' };
  }

  const { senderEmail, senderName } = getSenderInfo(env);
  const rawMime = buildMimeMessage({
    fromName: senderName,
    fromEmail: senderEmail,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
  const encodedRaw = encodeBase64UrlUtf8(rawMime);

  const attemptSend = async (accessToken: string) =>
    fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedRaw }),
    });

  let accessToken = await getGmailAccessToken(env);
  let res = await attemptSend(accessToken);

  if (res.status === 401) {
    clearGmailTokenCache();
    accessToken = await getGmailAccessToken(env);
    res = await attemptSend(accessToken);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[GmailMailer] Gmail send failed:', {
      status: res.status,
      to: options.to,
      subject: options.subject,
      body: errText,
    });
    throw new Error(`Gmail API send failed (${res.status}): ${errText}`);
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string };
  return {
    ok: true,
    mode: 'gmail-api',
    messageId: data.id,
  };
}

/**
 * Send an instant admin alert using Cloudflare Workers `send_email` binding (`ADMIN_ALERT_EMAIL`)
 * when configured, falling back to `sendGmailEmail` to `GMAIL_SENDER_EMAIL` / `ADMIN_EMAIL`.
 */
export async function sendAdminAlertEmail(
  env: Env,
  options: Omit<GmailEmailOptions, 'to'> & { to?: string },
): Promise<GmailSendResult> {
  const { senderEmail, senderName } = getSenderInfo(env);
  const targetAdmin = options.to?.trim() || env.ADMIN_EMAIL?.trim() || senderEmail;

  if (env.ADMIN_ALERT_EMAIL && typeof env.ADMIN_ALERT_EMAIL.send === 'function') {
    try {
      const rawMime = buildMimeMessage({
        fromName: senderName,
        fromEmail: senderEmail,
        to: targetAdmin,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      let messagePayload: unknown = {
        from: senderEmail,
        to: targetAdmin,
        raw: rawMime,
      };

      try {
        const cfEmailModuleName = 'cloudflare:email';
        const mod = (await import(/* @vite-ignore */ cfEmailModuleName)) as {
          EmailMessage?: new (from: string, to: string, raw: string) => unknown;
        };
        if (typeof mod?.EmailMessage === 'function') {
          messagePayload = new mod.EmailMessage(senderEmail, targetAdmin, rawMime);
        }
      } catch {
        // Non-Workers runtime (e.g., Node test runner) uses plain object payload
      }

      await env.ADMIN_ALERT_EMAIL.send(messagePayload);
      return { ok: true, mode: 'workers-email' };
    } catch (err) {
      console.warn(
        '[GmailMailer] ADMIN_ALERT_EMAIL send_email binding failed, falling back to Gmail REST API:',
        err,
      );
    }
  }

  return sendGmailEmail(env, {
    to: targetAdmin,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}
