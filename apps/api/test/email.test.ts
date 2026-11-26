import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMimeMessage,
  clearGmailTokenCache,
  encodeBase64UrlUtf8,
  encodeRfc2047Subject,
  getGmailAccessToken,
  sendAdminAlertEmail,
  sendGmailEmail,
} from '../src/lib/gmail-mailer.js';
import { sendPaymentRejectedEmail } from '../src/services/email.js';
import type { Env } from '../src/types.js';

function createBaseEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    ENVIRONMENT: 'production',
    STORE_NAME: 'AnuVarnika Sarees',
    ADMIN_EMAIL: 'anuvarnika.sarees@gmail.com',
    GMAIL_SENDER_EMAIL: 'anuvarnika.sarees@gmail.com',
    GMAIL_SENDER_NAME: 'AnuVarnika Sarees',
    GMAIL_CLIENT_ID: 'test-client-id',
    GMAIL_CLIENT_SECRET: 'test-client-secret',
    GMAIL_REFRESH_TOKEN: 'test-refresh-token',
    ...overrides,
  };
}

test('GmailMailer MIME & Base64URL Encoding + OAuth2 + Send Flow', async (t) => {
  await t.test('encodeBase64UrlUtf8 produces URL-safe unpadded base64 for UTF-8 ₹', () => {
    const encoded = encodeBase64UrlUtf8('Kanchipuram Silk ₹12,999 + Zari/Border=');
    assert.ok(!encoded.includes('+'));
    assert.ok(!encoded.includes('/'));
    assert.ok(!encoded.endsWith('='));

    // Decode back via Node Buffer in test only to verify round-trip UTF-8 correctness
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    assert.equal(decoded, 'Kanchipuram Silk ₹12,999 + Zari/Border=');
  });

  await t.test('encodeRfc2047Subject encodes non-ASCII subjects with UTF-8 Base64', () => {
    assert.equal(encodeRfc2047Subject('Plain ASCII Subject'), 'Plain ASCII Subject');
    const encoded = encodeRfc2047Subject('Order #AV-101: ₹14,500');
    assert.match(encoded, /^=\?UTF-8\?B\?.+\?=$/);
  });

  await t.test('buildMimeMessage produces RFC 5322 multipart/alternative with CRLF', () => {
    const mime = buildMimeMessage({
      fromName: 'AnuVarnika Sarees',
      fromEmail: 'anuvarnika.sarees@gmail.com',
      to: 'buyer@example.com',
      subject: 'Order #AV-101 ₹14,500',
      text: 'Total: ₹14,500',
      html: '<p>Total: <strong>₹14,500</strong></p>',
    });

    assert.ok(mime.includes('\r\n'));
    assert.ok(!mime.replace(/\r\n/g, '').includes('\n'));
    assert.ok(mime.includes('From: "AnuVarnika Sarees" <anuvarnika.sarees@gmail.com>\r\n'));
    assert.ok(mime.includes('To: buyer@example.com\r\n'));
    assert.ok(mime.includes('Content-Type: multipart/alternative; boundary="anuvarnika_'));
    assert.ok(mime.includes('Content-Type: text/plain; charset="UTF-8"\r\n'));
    assert.ok(mime.includes('Content-Type: text/html; charset="UTF-8"\r\n'));
  });

  await t.test('sendGmailEmail uses dev-console fallback when refresh token missing in development', async () => {
    const env = createBaseEnv({
      ENVIRONMENT: 'development',
      GMAIL_REFRESH_TOKEN: '',
    });
    const result = await sendGmailEmail(env, {
      to: 'dev@example.com',
      subject: 'OTP Code 123456',
      text: 'Your OTP is 123456',
      html: '<p>Your OTP is 123456</p>',
    });
    assert.equal(result.ok, true);
    assert.equal(result.mode, 'dev-console');
  });

  await t.test('getGmailAccessToken caches token per isolate and handles invalid_grant', async () => {
    clearGmailTokenCache();
    const originalFetch = globalThis.fetch;
    let tokenCalls = 0;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        tokenCalls += 1;
        return new Response(
          JSON.stringify({ access_token: 'ya29.cached-token', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const env = createBaseEnv();
      const t1 = await getGmailAccessToken(env);
      const t2 = await getGmailAccessToken(env);
      assert.equal(t1, 'ya29.cached-token');
      assert.equal(t2, 'ya29.cached-token');
      assert.equal(tokenCalls, 1);

      clearGmailTokenCache();
      globalThis.fetch = (async () =>
        new Response(
          JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Token has been expired or revoked.',
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        )) as typeof fetch;

      await assert.rejects(() => getGmailAccessToken(env), /invalid_grant/);
    } finally {
      globalThis.fetch = originalFetch;
      clearGmailTokenCache();
    }
  });

  await t.test('sendGmailEmail sends base64url MIME payload to Gmail REST API', async () => {
    clearGmailTokenCache();
    const originalFetch = globalThis.fetch;
    let capturedRaw = '';

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://oauth2.googleapis.com/token') {
        return new Response(
          JSON.stringify({ access_token: 'ya29.test-token', expires_in: 3600 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
        assert.equal((init?.headers as Record<string, string>)?.Authorization, 'Bearer ya29.test-token');
        const body = JSON.parse(String(init?.body)) as { raw: string };
        capturedRaw = body.raw;
        return new Response(JSON.stringify({ id: 'msg_123' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    }) as typeof fetch;

    try {
      const env = createBaseEnv();
      const result = await sendGmailEmail(env, {
        to: 'customer@example.com',
        subject: 'Order #AV-999 ₹9,999',
        text: 'Order confirmed for ₹9,999',
        html: '<p>Order confirmed for <strong>₹9,999</strong></p>',
      });
      assert.equal(result.ok, true);
      assert.equal(result.mode, 'gmail-api');
      assert.equal(result.messageId, 'msg_123');
      assert.ok(capturedRaw.length > 50);
      assert.ok(!capturedRaw.includes('+'));
      assert.ok(!capturedRaw.includes('/'));
      assert.ok(!capturedRaw.endsWith('='));
    } finally {
      globalThis.fetch = originalFetch;
      clearGmailTokenCache();
    }
  });

  await t.test('sendAdminAlertEmail prefers ADMIN_ALERT_EMAIL binding and falls back to Gmail', async () => {
    let bindingCalled = false;
    const envWithBinding = createBaseEnv({
      ADMIN_ALERT_EMAIL: {
        send: async () => {
          bindingCalled = true;
        },
      },
    });

    const res1 = await sendAdminAlertEmail(envWithBinding, {
      subject: 'UTR Submitted',
      text: 'UTR 123456789012',
      html: '<p>UTR 123456789012</p>',
    });
    assert.equal(bindingCalled, true);
    assert.equal(res1.mode, 'workers-email');

    const envDevFallback = createBaseEnv({
      ENVIRONMENT: 'development',
      GMAIL_REFRESH_TOKEN: '',
    });
    const res2 = await sendAdminAlertEmail(envDevFallback, {
      subject: 'UTR Submitted',
      text: 'UTR 123456789012',
      html: '<p>UTR 123456789012</p>',
    });
    assert.equal(res2.mode, 'dev-console');
  });

  await t.test('sendPaymentRejectedEmail sends action-needed notification', async () => {
    const env = createBaseEnv({
      ENVIRONMENT: 'development',
      GMAIL_REFRESH_TOKEN: '',
    });
    const res = await sendPaymentRejectedEmail(
      env,
      {
        id: 'ord_1',
        orderNumber: 'AV-2026-001',
        shippingName: 'Ananya',
        shippingEmail: 'ananya@example.com',
        totalPaise: 599900,
      },
      'UTR did not match bank statement',
    );
    assert.equal(res.success, true);
  });
});
