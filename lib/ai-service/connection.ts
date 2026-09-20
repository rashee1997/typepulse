/**
 * Connection diagnostics for the Settings → AI Provider panel.
 *
 * Extracted from `lib/ai-service.ts`. Isolated from the generators because it is
 * the only place in the AI layer that performs a *probe* request rather than a
 * generation request: it must never be gated behind `canUseLlm`, since its whole
 * purpose is to tell the user whether the settings they just typed work.
 */

import { AISettings } from '@/types/typing';
import { resolveTransport } from './providers';

// Test the endpoint the resolved transport would actually call
export async function testAiConnection(settings: AISettings): Promise<{ success: boolean; message: string; models?: string[] }> {
  if (resolveTransport(settings) === 'gemini') {
    try {
      const res = await fetch('/api/gemini/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Connection test. Reply with the single word OK.',
          systemInstruction: 'Reply with exactly one word and nothing else.',
          temperature: 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gemini server route error');
      return { success: true, message: 'Connected successfully to Google Gemini server!' };
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to connect to Gemini' };
    }
  }

  if (!settings.endpoint) {
    return { success: false, message: 'Please specify an API endpoint URL.' };
  }

  const endpoint = settings.endpoint.replace(/\/+$/, '');
  const url = endpoint.endsWith('/v1') ? `${endpoint}/models` : `${endpoint}/v1/models`;

  // Attempt direct fetch first, if CORS error occurs and useServerProxy is false, suggest proxy
  try {
    if (settings.useServerProxy) {
      const res = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: settings.endpoint,
          apiKey: settings.apiKey,
          path: '/models',
          body: {},
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const modelNames = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).slice(0, 10) : undefined;
      return { success: true, message: 'Connection successful via server proxy!', models: modelNames };
    } else {
      const headers: Record<string, string> = {};
      if (settings.apiKey) {
        headers['Authorization'] = `Bearer ${settings.apiKey.trim()}`;
      }
      const res = await fetch(url, { method: 'GET', headers });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      const modelNames = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).slice(0, 10) : undefined;
      return { success: true, message: 'Direct connection successful!', models: modelNames };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Connection failed';
    if (!settings.useServerProxy && (errorMsg.includes('Failed to fetch') || errorMsg.includes('CORS') || errorMsg.includes('NetworkError'))) {
      return {
        success: false,
        message: 'Browser blocked direct request (CORS). Enable the "Use Server Proxy" toggle to connect safely!',
      };
    }
    return { success: false, message: errorMsg };
  }
}
