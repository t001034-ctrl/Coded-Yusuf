# StoryTeller

A four-page illustrated storybook generator. Describe an idea, pick a genre, and get back a story written by Claude (with genre-tuned narrative voice), illustrated by Gemini Flash Image, and narrated by ElevenLabs.

Built with Next.js 16 (App Router) + Tailwind 4 + TypeScript.

## Stack

- **Story** — `anthropic/claude-sonnet-4.5` via OpenRouter, JSON output of 4 narrative beats
- **Images** — `google/gemini-2.5-flash-image` via OpenRouter, one illustration per page
- **Narration** — ElevenLabs TTS with a different default voice + tuned settings per genre
- **UI** — Cosmic + parchment fantasy theme (Cinzel + Cormorant Garamond), animated starfield, drop-cap parchment pages, page-flip transitions

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in your keys
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable                  | Required | Default                                |
| ------------------------- | -------- | -------------------------------------- |
| `OPENROUTER_API_KEY`      | yes      | —                                      |
| `OPENROUTER_STORY_MODEL`  | no       | `anthropic/claude-sonnet-4.5`          |
| `OPENROUTER_IMAGE_MODEL`  | no       | `google/gemini-2.5-flash-image`        |
| `ELEVENLABS_API_KEY`      | yes      | —                                      |
| `ELEVENLABS_MODEL`        | no       | `eleven_multilingual_v2`               |

Get keys from https://openrouter.ai/keys and https://elevenlabs.io/app/settings/api-keys. The ElevenLabs key needs `text_to_speech` permission enabled.

## Deploy to Vercel

This project lives in the `storyteller/` subfolder of a multi-project repo. When importing into Vercel:

1. Go to https://vercel.com/new and **Import Git Repository** → pick this repo.
2. **Root Directory:** click *Edit* and set it to `storyteller`. (Vercel will then auto-detect Next.js.)
3. **Environment Variables:** add the five variables from the table above (paste your real keys).
4. Click **Deploy**.

The first build takes ~2 minutes. Subsequent pushes to `main` auto-deploy.

> **Function timeouts:** the story / image / narrate routes have `export const maxDuration = 60` so generation has room to finish on Vercel's Hobby plan.

## Project layout

```
storyteller/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── story/route.ts     # Claude → 4-page JSON
│   │   │   ├── image/route.ts     # Gemini → PNG per page
│   │   │   └── narrate/route.ts   # ElevenLabs → MP3 per page
│   │   ├── layout.tsx
│   │   ├── page.tsx               # Reader UI
│   │   └── globals.css
│   └── lib/openrouter.ts
└── public/
```
