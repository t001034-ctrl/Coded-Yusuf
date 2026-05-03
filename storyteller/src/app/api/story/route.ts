import { OPENROUTER_URL, openRouterHeaders } from "@/lib/openrouter";

export const runtime = "nodejs";
// 4-page JSON generation can take 40-60s. Vercel Hobby caps at 60s.
export const maxDuration = 60;

const PAGE_COUNT = 4;

const LENGTH_TOKENS = {
  short: 1200,
  medium: 2400,
  long: 4000,
} as const;

const GENRE_VOICE: Record<string, string> = {
  fantasy:
    "Lush, sensory, mythic cadence. Reach for slightly archaic, image-rich vocabulary. Name places, lineages, and small details that imply a wider world. Slow the rhythm at moments of wonder.",
  "sci-fi":
    "Precise and technical, cool in tone. Reveal the world through plausible jargon and offhand specifics rather than explanation. Let unfamiliar tech feel ordinary to the characters; let the reader catch up.",
  mystery:
    "Withhold. Observe rather than explain. Let unease leak through ordinary details — a pause, an absence, the wrong silence. Foreshadow without naming. Trust the reader to assemble the picture.",
  horror:
    "Short, tight sentences. Build dread through sensory specifics — texture, smell, breath, threshold. Restraint over gore. Use white space and what is *not* shown. Minimize dialogue.",
  romance:
    "Render interior emotion in fine grain. Slow time at pivotal moments. Use warm sensory intimacy — touch, gaze, breath, the specific weight of words spoken and unspoken.",
  adventure:
    "Kinetic verbs, forward momentum. Choreograph action with clarity — what moves, what fails, what holds. Cut quickly between beats. Reward the reader with vivid set-pieces.",
  comedy:
    "Rhythm-based humor through specific absurdity and surprise reversals. Dry observation; the world stays straight while behaving strangely. Trust the punchlines to land without commentary.",
  "fairy tale":
    "Classical incantatory cadence ('Once upon a time...', 'It came to pass...'). Use repetition of threes, archetypal figures, and a gentle moral undertone. Plain, ringing language.",
};

type Length = keyof typeof LENGTH_TOKENS;

type StoryRequest = {
  prompt?: string;
  genre?: string;
  length?: Length;
};

type Page = { text: string; imagePrompt: string };

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function parsePages(raw: string): Page[] | null {
  const cleaned = stripCodeFences(raw.trim());
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return null;
  }
  const root = parsed as { pages?: unknown };
  const pages = Array.isArray(root.pages) ? root.pages : null;
  if (!pages || pages.length === 0) return null;
  const result: Page[] = [];
  for (const p of pages) {
    const obj = p as { text?: unknown; imagePrompt?: unknown };
    if (typeof obj.text !== "string" || typeof obj.imagePrompt !== "string") {
      return null;
    }
    result.push({ text: obj.text.trim(), imagePrompt: obj.imagePrompt.trim() });
  }
  return result;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: StoryRequest;
  try {
    body = (await request.json()) as StoryRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json(
      { error: "Please describe the story you want." },
      { status: 400 },
    );
  }

  const genre = body.genre?.trim() || "any";
  const length: Length =
    body.length && body.length in LENGTH_TOKENS ? body.length : "medium";
  const maxTokens = LENGTH_TOKENS[length];
  const wordsPerPage =
    length === "short" ? "100-150" : length === "long" ? "300-400" : "180-250";
  const model = process.env.OPENROUTER_STORY_MODEL || "anthropic/claude-sonnet-4.5";

  const voiceGuidance =
    GENRE_VOICE[genre.toLowerCase()] ??
    "Match prose style to the genre: distinct voice, vivid sensory detail, tight pacing.";

  const systemPrompt = `You are StoryTeller, an imaginative author who writes short illustrated stories.
You always reply with strict JSON matching this exact schema and nothing else:
{
  "pages": [
    { "text": string, "imagePrompt": string },
    { "text": string, "imagePrompt": string },
    { "text": string, "imagePrompt": string },
    { "text": string, "imagePrompt": string }
  ]
}

Rules:
- Exactly ${PAGE_COUNT} pages.
- Each page is one narrative beat: setup, rising action, climax, resolution.
- "text" is the prose for that page (${wordsPerPage} words). Vivid, sensory, no headings, no scene labels, no "Page 1:" prefixes.
- "imagePrompt" is a concrete visual description for an illustrator (subject, setting, mood, lighting, style). 1-2 sentences. No text or words to render in the image.
- Maintain consistent characters and setting across pages so illustrations match.
- Output only the JSON object — no preamble, no markdown fences.

Narrative voice for genre "${genre}":
${voiceGuidance}
Commit to this voice throughout all four pages. Do not flatten into generic prose.`;

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Write a ${genre} story idea spread across ${PAGE_COUNT} illustrated pages.\n\nIdea: ${prompt}`,
          },
        ],
      }),
    });

    const data = (await upstream.json()) as ChatResponse;
    if (!upstream.ok || data.error) {
      return Response.json(
        { error: data.error?.message ?? `Upstream error (${upstream.status}).` },
        { status: 502 },
      );
    }

    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!raw) {
      return Response.json(
        { error: "Model returned no content." },
        { status: 502 },
      );
    }

    const pages = parsePages(raw);
    if (!pages || pages.length !== PAGE_COUNT) {
      return Response.json(
        {
          error: `Model returned malformed pages (expected ${PAGE_COUNT}). Try again.`,
        },
        { status: 502 },
      );
    }

    return Response.json({ pages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Story generation failed: ${message}` },
      { status: 502 },
    );
  }
}
