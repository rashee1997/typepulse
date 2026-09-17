import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { endpoint, apiKey, body, path = '/chat/completions' } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint URL' }, { status: 400 });
    }

    // Sanitize endpoint URL
    const cleanEndpoint = endpoint.replace(/\/+$/, '');
    const targetUrl = cleanEndpoint.endsWith('/v1') 
      ? `${cleanEndpoint}${path}`
      : `${cleanEndpoint}/v1${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || data?.message || `Endpoint returned HTTP ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('AI Proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to connect to endpoint' },
      { status: 500 }
    );
  }
}
