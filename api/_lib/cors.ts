import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:8081',
  'https://safarlink.in',
  'https://www.safarlink.in',
]);

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

function resolveOrigin(req: VercelRequest): string {
  const originHeader = req.headers.origin;
  const origin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://safarlink.in';
}

export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = resolveOrigin(req);

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export function withCors(handler: Handler): Handler {
  return async (req, res) => {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    await handler(req, res);
  };
}
