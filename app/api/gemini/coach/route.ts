import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const COACH_MODEL = 'gemini-3.8-flash';
const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
]);

/** A turn of the conversation, as the client sends it. */
interface IncomingMessage {
  role?: string;
  content?: string;
}

const MAX_TURNS = 12;
const MAX_TURN_CHARS = 4_000;
const MAX_SYSTEM_INSTRUCTION_CHARS = 4_000;

/**
 * Normalises the incoming turns into Gemini's `contents` shape.
 */
function toContents(messages: IncomingMessage[], prompt?: string) {
  const turns = messages
    .filter((message) => typeof message?.content === 'string' && message.content.trim().length > 0)
    .slice(-MAX_TURNS)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content!.slice(0, MAX_TURN_CHARS) }],
    }));

  if (turns.length > 0) return turns;
  if (typeof prompt === 'string' && prompt.trim().length > 0) {
    return [{ role: 'user', parts: [{ text: prompt.slice(0, MAX_TURN_CHARS) }] }];
  }
  return [];
}

/**
 * Lets the client discover that this deployment has its own model key.
 */
export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.GEMINI_API_KEY),
    model: COACH_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous';

    const rate = checkRateLimit(`gemini_coach:${clientIp}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down and try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rate.resetInSeconds),
          },
        }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
    }

    const json = await req.json().catch(() => null);
    if (!json || typeof json !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    const {
      prompt,
      messages = [],
      systemInstruction,
      temperature = 0.7,
      maxTokens,
      stream = false,
      jsonMode = false,
      model,
    }: {
      prompt?: string;
      messages?: IncomingMessage[];
      systemInstruction?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
      jsonMode?: boolean;
      model?: string;
    } = json;

    // Enforce model allowlist
    const selectedModel = (model && ALLOWED_MODELS.has(model)) ? model : COACH_MODEL;

    const contents = toContents(Array.isArray(messages) ? messages : [], prompt);
    if (contents.length === 0) {
      return NextResponse.json({ error: 'Missing prompt or messages' }, { status: 400 });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const sanitizedSystemInstruction = (
      typeof systemInstruction === 'string' && systemInstruction.trim().length > 0
        ? systemInstruction.slice(0, MAX_SYSTEM_INSTRUCTION_CHARS)
        : 'You are an elite, encouraging, high-precision touch typing coach. Keep every answer concise, specific and actionable.'
    );

    const config: Record<string, unknown> = {
      systemInstruction: sanitizedSystemInstruction,
      temperature: typeof temperature === 'number' ? Math.min(2, Math.max(0, temperature)) : 0.7,
    };

    if (typeof maxTokens === 'number' && Number.isFinite(maxTokens)) {
      config.maxOutputTokens = Math.min(4_096, Math.max(64, Math.round(maxTokens)));
    }

    if (jsonMode) {
      config.responseMimeType = 'application/json';
    }

    if (stream) {
      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
        config,
      });

      const encoder = new TextEncoder();
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              const text = chunk.text;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (streamError) {
            controller.error(streamError);
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    const reply = response.text || '';
    return NextResponse.json({ reply, text: reply });
  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred while communicating with the AI service.' },
      { status: 500 }
    );
  }
}
