/**
 * Code Pulse: real source code used as typing practice material.
 *
 * Extracted from `lib/ai-service.ts`. Two invariants decide every path here:
 * the snippet must be *valid* in the requested language, and it must exercise
 * punctuation the typist actually has to reach for. That is why the response is
 * parsed with `parseLlmJson` (a model that fences its JSON would otherwise lose
 * the whole call) and why the local per-language banks exist as the floor.
 */

import { AISettings } from '@/types/typing';
import { CODE_SYSTEM_PROMPT } from '../ai-prompts';
import { callLlm, parseLlmJson } from './transport';
import { canUseLlm } from './providers';

/**
 * Polyglot Code-Pulse Developer Drills Generator.
 * Generates syntactically valid code blocks rich with punctuation and symbols.
 */
export async function generateCodePulseDrill(
  language: 'typescript' | 'python' | 'rust' | 'go' | 'sql',
  complexity: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  settings?: AISettings
): Promise<{ code: string; language: string; description: string; targetSymbols: string[] }> {
  if (canUseLlm(settings)) {
    try {
      const prompt = `Write one ${complexity} ${language} snippet for touch-typing practice.

Return one JSON object with exactly these keys:
{"code": string, "description": string, "targetSymbols": string[]}

Requirements:
- code: 5 to 8 lines (35 to 55 tokens) of valid, idiomatic ${language} with real indentation and no comments. Use constructs rich in brackets, braces, arrows, colons and quotes.
- description: one sentence naming the construct being practised.
- targetSymbols: the 5 to 8 punctuation strings this snippet actually exercises, listed exactly as they appear.
- No markdown fences inside the code value, and no placeholder identifiers or ellipses.

Output valid JSON only, with no prose before or after it.`;

      const parsed = parseLlmJson<{ code?: string; description?: string; targetSymbols?: unknown }>(
        await callLlm(prompt, CODE_SYSTEM_PROMPT, settings, { temperature: 0.4, jsonMode: true, maxTokens: 700 })
      );
      if (parsed?.code && parsed.code.length > 20) {
        const targetSymbols = Array.isArray(parsed.targetSymbols)
          ? parsed.targetSymbols.filter((symbol): symbol is string => typeof symbol === 'string' && symbol.length > 0).slice(0, 8)
          : [];
        return {
          code: parsed.code,
          language,
          description: parsed.description || `${language.toUpperCase()} syntax challenge`,
          targetSymbols: targetSymbols.length > 0 ? targetSymbols : ['{', '}', '(', ')', '=>', ';'],
        };
      }
    } catch {
      // Fallback to deterministic code corpus
    }
  }

  // High-craft deterministic code banks with authentic syntax
  const codeBanks: Record<string, { code: string; description: string; targetSymbols: string[] }[]> = {
    typescript: [
      {
        code: `interface CacheEntry<T> {\n  key: string;\n  value: T;\n  ttlMs: number;\n  isValid: (now: number) => boolean;\n}`,
        description: 'Generic Interface with Arrow Function Property',
        targetSymbols: ['<', '>', '{', '}', ';', '=>', ':'],
      },
      {
        code: `const fetchUser = async (id: string): Promise<User | null> => {\n  const res = await api.get(\`/users/\${id}\`);\n  return res.ok ? res.data : null;\n};`,
        description: 'Async Generic Fetch with Template Literals and Ternary',
        targetSymbols: ['(', ')', '=>', '<', '>', '{', '}', '`', '$', ':', ';'],
      },
      {
        code: `const sum = items.reduce((acc, curr) => acc + curr.score, 0);\nconst filtered = items.filter((x) => x.active && x.score >= 50);`,
        description: 'Array Transformation Pipeline with Predicates',
        targetSymbols: ['(', ')', '=>', '.', '&&', '>=', ';'],
      },
    ],
    python: [
      {
        code: `def calculate_metrics(values: list[float]) -> dict[str, float]:\n    mean_val = sum(values) / len(values)\n    return {"mean": mean_val, "count": float(len(values))}`,
        description: 'Typed Function Definition with Dictionary Return',
        targetSymbols: ['(', ')', '->', '[', ']', ':', '{', '}', '"'],
      },
      {
        code: `for item in batch:\n    if item.get("status") == "ready" and item.get("retries", 0) < 3:\n        process_item(item["id"])`,
        description: 'Conditional Batch Processing Loop',
        targetSymbols: [':', '(', ')', '==', '"', '<', '[', ']'],
      },
    ],
    rust: [
      {
        code: `pub fn parse_header(input: &str) -> Result<Header, ParseError> {\n    let parts: Vec<&str> = input.split(':').collect();\n    Ok(Header::new(parts[0], parts[1]))\n}`,
        description: 'Result Error Handling with References and Vector Slices',
        targetSymbols: ['&', '->', '<', '>', '{', '}', '::', '(', ')', '[', ']', ';'],
      },
    ],
    go: [
      {
        code: `func ProcessQueue(ctx context.Context, jobs <-chan Job) error {\n\tselect {\n\tcase job := <-jobs:\n\t\treturn job.Execute(ctx)\n\tcase <-ctx.Done():\n\t\treturn ctx.Err()\n\t}\n}`,
        description: 'Go Concurrency Channel Selector with Context Handling',
        targetSymbols: ['(', ')', '{', '}', '<-', ':=', ':', '\t'],
      },
    ],
    sql: [
      {
        code: `SELECT u.id, u.email, COUNT(o.id) AS total_orders\nFROM users u\nLEFT JOIN orders o ON o.user_id = u.id\nWHERE u.created_at >= '2025-01-01'\nGROUP BY u.id, u.email\nHAVING COUNT(o.id) > 5;`,
        description: 'Analytical Left Join with Aggregation and Having Clause',
        targetSymbols: ['.', ',', '(', ')', '>=', "'", ';', '>'],
      },
    ],
  };

  const langList = codeBanks[language] || codeBanks.typescript;
  const picked = langList[Math.floor(Math.random() * langList.length)];
  return {
    code: picked.code,
    language,
    description: picked.description,
    targetSymbols: picked.targetSymbols,
  };
}
