import { Hono } from 'hono';
import { AppContext } from '../types.js';

export const uploadRouter = new Hono<AppContext>();

// Upload image to Cloudflare R2
uploadRouter.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file provided in form data' }, 400);
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMime.includes(file.type)) {
      return c.json({ error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.' }, 400);
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const key = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // If R2 Bucket binding is present
    if (c.env.BUCKET) {
      const arrayBuffer = await file.arrayBuffer();
      await c.env.BUCKET.put(key, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });
    }

    const publicUrl = c.env.R2_PUBLIC_URL
      ? `${c.env.R2_PUBLIC_URL}/${key}`
      : `/api/upload/${key}`;

    return c.json({
      success: true,
      key,
      url: publicUrl,
      size: file.size,
      name: file.name,
    });
  } catch (error: any) {
    console.error('R2 upload error:', error);
    return c.json({ error: error.message || 'File upload failed' }, 500);
  }
});

// Serve image from R2 bucket
uploadRouter.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  if (!c.env.BUCKET) {
    // If running in development without R2, return a fallback SVG or 404
    return c.text('R2 bucket binding not connected in local environment', 404);
  }

  const object = await c.env.BUCKET.get(key);
  if (!object) {
    return c.text('Image not found', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});
