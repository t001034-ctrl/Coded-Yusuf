import { OPENROUTER_URL, openRouterHeaders } from "@/lib/openrouter";

export const runtime = "nodejs";

type ImageRequest = {
  prompt?: string;
  genre?: string;
};

type ImageBlock = {
  type?: string;
  image_url?: { url?: string };
};

type ChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
      images?: ImageBlock[];
    };
  }>;
  error?: { message?: string };
};

function extractImageDataUrl(data: ChatResponse): string | null {
  const message = data.choices?.[0]?.message;
  if (!message) return null;

  const fromImages = message.images?.find((b) => b.image_url?.url)?.image_url?.url;
  if (fromImages) return fromImages;

  const content = message.content;
  if (typeof content === "string") {
    const match = content.match(/data:image\/[a-zA-Z]+;base64,[A-Za-z0-9+/=]+/);
    if (match) return match[0];
  }

  return null;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENROUTER_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: ImageRequest;
  try {
    body = (await request.json()) as ImageRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return Response.json(
      { error: "Missing image prompt." },
      { status: 400 },
    );
  }

  const genre = body.genre?.trim() || "";
  const model =
    process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image";

  const fullPrompt = [
    `Create a single book-cover-style illustration for a ${genre || "fiction"} story.`,
    `Scene/idea: ${prompt}`,
    "Style: cinematic, evocative, painterly. No text, no titles, no captions, no watermarks. Aspect ratio 16:9.",
  ].join("\n");

  try {
    const upstream = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: openRouterHeaders(apiKey),
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        messages: [{ role: "user", content: fullPrompt }],
      }),
    });

    const data = (await upstream.json()) as ChatResponse;
    if (!upstream.ok || data.error) {
      return Response.json(
        { error: data.error?.message ?? `Upstream error (${upstream.status}).` },
        { status: 502 },
      );
    }

    const imageUrl = extractImageDataUrl(data);
    if (!imageUrl) {
      return Response.json(
        { error: "Model returned no image." },
        { status: 502 },
      );
    }

    return Response.json({ imageUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Image generation failed: ${message}` },
      { status: 502 },
    );
  }
}
