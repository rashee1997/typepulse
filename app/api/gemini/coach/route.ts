import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

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
      systemInstruction,
      temperature = 0.7,
      stream = false,
      jsonMode = false,
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
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
        'You are an elite, encouraging, high-precision touch typing coach. Keep all answers concise, practical, and action-oriented.',
      temperature,
    };

    if (jsonMode) {
      config.responseMimeType = 'application/json';
    }

    if (stream) {
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3.8-flash',
        contents: prompt,
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
      model: 'gemini-3.8-flash',
      contents: prompt,
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
