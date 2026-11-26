import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/index.js';
import { createTestD1 } from './d1-mock.js';
import {
  buildOwnerVerifyDeepLink,
  escapeTelegramHtml,
  sendOwnerTelegramPaymentAlert,
} from '../src/lib/telegram-owner-alert.js';

test('Telegram Owner Alerts & Atomic D1 Visitor Counter', async (t) => {
  const mockD1 = createTestD1();
  const baseEnv = {
    DB: mockD1,
    ENVIRONMENT: 'development',
    STORE_NAME: 'AnuVarnika Sarees',
    UPI_ID: 'anuvarnika@okaxis',
    ADMIN_EMAIL: 'anuvarnika.sarees@gmail.com',
    SESSION_SECRET: 'test-secret-minimum-32-characters-for-tests',
    APP_BASE_URL: 'https://anuvarnikasarees.pages.dev',
  };

  await t.test('1. Telegram HTML escaping, deep-link builder & sendMessage payload', async () => {
    assert.equal(escapeTelegramHtml('A & B <script>'), 'A &amp; B &lt;script&gt;');
    assert.equal(
      buildOwnerVerifyDeepLink(baseEnv as any, 'ord_123'),
      'https://anuvarnikasarees.pages.dev/admin/orders/ord_123?action=verify',
    );

    const originalFetch = globalThis.fetch;
    let capturedPayload: any = null;

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      assert.equal(String(input), 'https://api.telegram.org/botbot123:secret/sendMessage');
      capturedPayload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const res = await sendOwnerTelegramPaymentAlert(
        {
          ...baseEnv,
          TELEGRAM_BOT_TOKEN: 'bot123:secret',
          TELEGRAM_OWNER_CHAT_ID: '987654321',
        } as any,
        {
          orderId: 'ord_999',
          orderNumber: 'AVS-999001',
          totalPaise: 1499900,
          utrReference: 'UTR123456789',
          customerName: 'Ananya <VIP>',
          customerPhone: '9876543210',
          items: [{ title: 'Kanchipuram & Zari', colorName: 'Maroon', quantity: 1 }],
        },
      );

      assert.equal(res.sent, true);
      assert.equal(res.mode, 'telegram');
      assert.equal(capturedPayload.chat_id, '987654321');
      assert.equal(capturedPayload.parse_mode, 'HTML');
      assert.deepEqual(capturedPayload.link_preview_options, { is_disabled: true });
      assert.ok(capturedPayload.text.includes('Ananya &lt;VIP&gt;'));
      assert.ok(capturedPayload.text.includes('Kanchipuram &amp; Zari'));
      assert.ok(capturedPayload.text.includes('UTR123456789'));
      assert.equal(
        capturedPayload.reply_markup.inline_keyboard[0][0].url,
        'https://anuvarnikasarees.pages.dev/admin/orders/ord_999?action=verify',
      );

      // Network failure must be caught gracefully without throwing
      globalThis.fetch = (async () => {
        throw new Error('Telegram timeout');
      }) as typeof fetch;

      const failedRes = await sendOwnerTelegramPaymentAlert(
        {
          ...baseEnv,
          TELEGRAM_BOT_TOKEN: 'bot123:secret',
          TELEGRAM_OWNER_CHAT_ID: '987654321',
        } as any,
        {
          orderId: 'ord_999',
          orderNumber: 'AVS-999001',
          totalPaise: 1499900,
          utrReference: 'UTR123456789',
          customerName: 'Ananya',
          customerPhone: '9876543210',
          items: [],
        },
      );
      assert.equal(failedRes.sent, false);
      assert.equal(failedRes.mode, 'error');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  await t.test('2. Atomic D1 Visitor Counter: unique vs page_view, bot filter & cache headers', async () => {
    // Bot request is ignored
    const botRes = await app.request(
      '/api/metrics/visit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        },
        body: JSON.stringify({ isUniqueToday: true }),
      },
      baseEnv,
    );
    assert.equal(botRes.status, 200);
    const botJson = (await botRes.json()) as any;
    assert.equal(botJson.counted, false);
    assert.equal(botJson.reason, 'bot_ignored');

    // First unique visit today
    const visit1 = await app.request(
      '/api/metrics/visit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14)',
        },
        body: JSON.stringify({ isUniqueToday: true }),
      },
      baseEnv,
    );
    assert.equal(visit1.status, 200);
    const visit1Json = (await visit1.json()) as any;
    assert.equal(visit1Json.counted, true);
    assert.equal(visit1Json.totalVisitors, 1);

    // Repeat session page view (not unique today)
    const visit2 = await app.request(
      '/api/metrics/visit',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 14)',
        },
        body: JSON.stringify({ isUniqueToday: false }),
      },
      baseEnv,
    );
    assert.equal(visit2.status, 200);
    const visit2Json = (await visit2.json()) as any;
    assert.equal(visit2Json.totalVisitors, 1);

    // Public visitors endpoint has 30s cache header
    const publicRes = await app.request('/api/metrics/visitors', {}, baseEnv);
    assert.equal(publicRes.status, 200);
    assert.equal(publicRes.headers.get('Cache-Control'), 'public, max-age=30, s-maxage=30');
    const publicJson = (await publicRes.json()) as any;
    assert.equal(publicJson.totalVisitors, 1);

    // Admin traffic analytics endpoint requires admin auth
    const unauthRes = await app.request('/api/admin/analytics/traffic', {}, baseEnv);
    assert.equal(unauthRes.status, 401);

    // Login as admin via OTP
    const otpSend = await app.request(
      '/api/auth/send-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'anuvarnika.sarees@gmail.com' }),
      },
      baseEnv,
    );
    const { devOtp } = (await otpSend.json()) as any;
    const otpVerify = await app.request(
      '/api/auth/verify-otp',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'anuvarnika.sarees@gmail.com', otp: devOtp }),
      },
      baseEnv,
    );
    const adminCookie = otpVerify.headers.get('set-cookie')!.split(';')[0];

    const trafficRes = await app.request(
      '/api/admin/analytics/traffic',
      { headers: { Cookie: adminCookie } },
      baseEnv,
    );
    assert.equal(trafficRes.status, 200);
    const trafficJson = (await trafficRes.json()) as any;
    assert.equal(trafficJson.totalVisitors, 1);
    assert.equal(trafficJson.todayUnique, 1);
    assert.equal(trafficJson.todayPageViews, 2);
    assert.equal(trafficJson.last30Days.length, 1);
  });
});
