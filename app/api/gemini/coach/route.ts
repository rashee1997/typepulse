import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

const COACH_MODEL = 'gemini-3.8-flash';

/** A turn of the conversation, as the client sends it. */
interface IncomingMessage {
  role?: string;
  content?: string;
}

const MAX_TURNS = 24;
const MAX_TURN_CHARS = 8_000;

/**
 * Normalises the incoming turns into Gemini's `contents` shape.
 *
 * The route used to accept a single `prompt` string, which made a real
 * conversation impossible: every follow-up question reached the model with no
 * history, so "and how do I drill that?" had nothing to refer to. `prompt` is
 * still accepted for single-shot callers.
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
 * Lets the client discover that this deployment has its own model key, so the
 * studio can use the built-in coach without the user pasting a key into
 * Settings. Reports capability only — never the key.
 */
export async function GET() {
  return NextResponse.json({
    available: Boolean(process.env.GEMINI_API_KEY),
    model: COACH_MODEL,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 503 }
      );
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
    } = await req.json();

    const selectedModel = model || COACH_MODEL;

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

    const config: Record<string, unknown> = {
      systemInstruction:
        systemInstruction ||
        'You are an elite, encouraging, high-precision touch typing coach. Keep every answer concise, specific and actionable.',
      // Honor the caller's temperature: the client asked for it and the route
      // used to silently drop it, so every task ran at the same 0.7.
      temperature: typeof temperature === 'number' ? Math.min(2, Math.max(0, temperature)) : 0.7,
    };

    if (typeof maxTokens === 'number' && Number.isFinite(maxTokens)) {
      config.maxOutputTokens = Math.min(8_192, Math.max(64, Math.round(maxTokens)));
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
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents,
      config,
    });

    return NextResponse.json({ text: response.text });
  } catch (error) {
    console.error('Gemini Coach error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate coaching response' },
      { status: 500 }
    );
  }
}
