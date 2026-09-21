import { NextRequest, NextResponse } from 'next/server';
import { validateProxyTarget } from '@/lib/ssrf-guard';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous';

    const rate = checkRateLimit(`ai_proxy:${clientIp}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many proxy requests. Please wait before retrying.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.resetInSeconds),
          },
        }
      );
    }

    const json = await req.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const { endpoint, apiKey, body, path = '/chat/completions' } = json;

    const validation = await validateProxyTarget(endpoint, path);
    if (!validation.valid || !validation.targetUrl) {
      return NextResponse.json(
        { error: validation.error || 'Invalid or forbidden target endpoint' },
        { status: 400 }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Runewright-Studio/1.0',
    };

    if (apiKey && typeof apiKey === 'string') {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(validation.targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body || {}),
      signal: AbortSignal.timeout(15000),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || data?.message || `Endpoint returned HTTP ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process AI proxy request' },
      { status: 500 }
    );
  }
}
