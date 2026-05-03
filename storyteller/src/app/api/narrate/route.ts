export const runtime = "nodejs";
// TTS can take up to ~30s for longer pages.
export const maxDuration = 60;

type NarrateRequest = {
  text?: string;
  genre?: string;
};

type VoiceSettings = {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
};

type GenreVoice = {
  voiceId: string;
  settings: VoiceSettings;
};

const DEFAULT_SETTINGS: VoiceSettings = {
  stability: 0.55,
  similarity_boost: 0.75,
  style: 0.35,
  use_speaker_boost: true,
};

// Modern ElevenLabs default voices (pre-installed for free tier accounts).
// Voice IDs are stable; settings are tuned per genre.
const GENRE_VOICES: Record<string, GenreVoice> = {
  fantasy: {
    // George — warm, mature male narrator
    voiceId: "JBFqnCBsd6RMkjVDRZzb",
    settings: { stability: 0.5, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true },
  },
  "sci-fi": {
    // Brian — cool male narrator
    voiceId: "nPczCjzI2devNBz1zQrb",
    settings: { stability: 0.6, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
  },
  mystery: {
    // Eric — deep, suspenseful male
    voiceId: "cjVigY5qzO86Huf0OWal",
    settings: { stability: 0.45, similarity_boost: 0.78, style: 0.5, use_speaker_boost: true },
  },
  horror: {
    // Bill — gravelly, dark older male
    voiceId: "pqHfZKP75CvOlQylNhV4",
    settings: { stability: 0.35, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true },
  },
  romance: {
    // Sarah — soft, warm female
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    settings: { stability: 0.7, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
  },
  adventure: {
    // Liam — energetic, younger male
    voiceId: "TX3LPaxmHKxFdv7VOQHJ",
    settings: { stability: 0.45, similarity_boost: 0.75, style: 0.55, use_speaker_boost: true },
  },
  comedy: {
    // Laura — playful, lighter female
    voiceId: "FGY2WhTYpPnrIDTdsKH5",
    settings: { stability: 0.4, similarity_boost: 0.7, style: 0.6, use_speaker_boost: true },
  },
  "fairy tale": {
    // Lily — warm, gentle female
    voiceId: "pFZP5JQG7iQjIQuC4Bku",
    settings: { stability: 0.65, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
  },
};

function pickVoice(genre: string): GenreVoice {
  return (
    GENRE_VOICES[genre.trim().toLowerCase()] ?? {
      // George as the safe default
      voiceId: "JBFqnCBsd6RMkjVDRZzb",
      settings: DEFAULT_SETTINGS,
    }
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ELEVENLABS_API_KEY is not set on the server." },
      { status: 500 },
    );
  }

  let body: NarrateRequest;
  try {
    body = (await request.json()) as NarrateRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) {
    return Response.json(
      { error: "Missing text to narrate." },
      { status: 400 },
    );
  }

  const genre = body.genre?.trim() || "any";
  const { voiceId, settings } = pickVoice(genre);
  const model = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: settings,
        }),
      },
    );

    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text().catch(() => "");
      let detail = errText;
      try {
        const parsed = JSON.parse(errText);
        detail =
          parsed?.detail?.message ||
          parsed?.detail ||
          parsed?.message ||
          errText;
      } catch {
        // keep raw
      }
      return Response.json(
        { error: `ElevenLabs error (${upstream.status}): ${detail || "unknown"}` },
        { status: 502 },
      );
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: `Narration failed: ${message}` },
      { status: 502 },
    );
  }
}
