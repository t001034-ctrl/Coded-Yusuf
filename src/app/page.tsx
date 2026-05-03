"use client";

import { useEffect, useRef, useState } from "react";

type Length = "short" | "medium" | "long";

type Page = { text: string; imagePrompt: string };

const GENRES = [
  "Fantasy",
  "Sci-fi",
  "Mystery",
  "Horror",
  "Romance",
  "Adventure",
  "Comedy",
  "Fairy tale",
];

function Ornament({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 16"
      className={className}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M0 8 H78 M122 8 H200"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.6"
      />
      <path
        d="M82 8 Q92 2 100 8 Q108 14 118 8"
        stroke="currentColor"
        strokeWidth="0.9"
        opacity="0.85"
      />
      <circle cx="100" cy="8" r="1.6" fill="currentColor" />
      <circle cx="78" cy="8" r="1" fill="currentColor" opacity="0.7" />
      <circle cx="122" cy="8" r="1" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Fantasy");
  const [length, setLength] = useState<Length>("medium");

  const [pages, setPages] = useState<Page[]>([]);
  const [images, setImages] = useState<(string | null)[]>([]);
  const [imageErrors, setImageErrors] = useState<(string | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [storyLoading, setStoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Audio narration
  const [audioUrls, setAudioUrls] = useState<(string | null)[]>([]);
  const [audioLoading, setAudioLoading] = useState<boolean[]>([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function clearAudioCache(urls: (string | null)[]) {
    urls.forEach((u) => {
      if (u) URL.revokeObjectURL(u);
    });
  }

  function stopAudio() {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setAudioPlaying(false);
  }

  function reset() {
    stopAudio();
    clearAudioCache(audioUrls);
    setPages([]);
    setImages([]);
    setImageErrors([]);
    setAudioUrls([]);
    setAudioLoading([]);
    setAudioError(null);
    setActiveIndex(0);
    setError(null);
  }

  // Stop playback whenever the user flips to another page
  useEffect(() => {
    stopAudio();
    setAudioError(null);
  }, [activeIndex]);

  // Cleanup blob URLs when unmounting
  useEffect(() => {
    return () => {
      clearAudioCache(audioUrls);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function narrateCurrent() {
    if (!current) return;
    setAudioError(null);

    // If already cached, just play
    const existing = audioUrls[activeIndex];
    if (existing && audioRef.current) {
      audioRef.current.src = existing;
      try {
        await audioRef.current.play();
        setAudioPlaying(true);
      } catch (err) {
        setAudioError(err instanceof Error ? err.message : "Playback error");
      }
      return;
    }

    setAudioLoading((prev) => {
      const next = [...prev];
      next[activeIndex] = true;
      return next;
    });

    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: current.text, genre }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAudioError(data.error ?? `Narration failed (${res.status}).`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrls((prev) => {
        const next = [...prev];
        next[activeIndex] = url;
        return next;
      });
      if (audioRef.current) {
        audioRef.current.src = url;
        try {
          await audioRef.current.play();
          setAudioPlaying(true);
        } catch (err) {
          setAudioError(err instanceof Error ? err.message : "Playback error");
        }
      }
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : "Network error");
    } finally {
      setAudioLoading((prev) => {
        const next = [...prev];
        next[activeIndex] = false;
        return next;
      });
    }
  }

  function toggleNarration() {
    if (audioPlaying) {
      stopAudio();
    } else {
      narrateCurrent();
    }
  }

  async function fetchImage(index: number, imagePrompt: string, genreLabel: string) {
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imagePrompt, genre: genreLabel }),
      });
      const data = (await res.json()) as { imageUrl?: string; error?: string };
      if (!res.ok || data.error) {
        setImageErrors((prev) => {
          const next = [...prev];
          next[index] = data.error ?? `Image ${index + 1} failed (${res.status}).`;
          return next;
        });
        return;
      }
      if (data.imageUrl) {
        setImages((prev) => {
          const next = [...prev];
          next[index] = data.imageUrl!;
          return next;
        });
      }
    } catch (err) {
      setImageErrors((prev) => {
        const next = [...prev];
        next[index] = err instanceof Error ? err.message : "Network error";
        return next;
      });
    }
  }

  async function generate() {
    if (!prompt.trim() || storyLoading) return;
    setStoryLoading(true);
    reset();
    try {
      const res = await fetch("/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, genre, length }),
      });
      const data = (await res.json()) as { pages?: Page[]; error?: string };
      if (!res.ok || data.error || !data.pages) {
        setError(data.error ?? `Request failed (${res.status}).`);
        return;
      }
      setPages(data.pages);
      setImages(new Array(data.pages.length).fill(null));
      setImageErrors(new Array(data.pages.length).fill(null));
      setAudioUrls(new Array(data.pages.length).fill(null));
      setAudioLoading(new Array(data.pages.length).fill(false));
      data.pages.forEach((p, i) => {
        fetchImage(i, p.imagePrompt, genre);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setStoryLoading(false);
    }
  }

  const hasStory = pages.length > 0;
  const total = pages.length;
  const current = pages[activeIndex];
  const currentImage = images[activeIndex];
  const currentImageError = imageErrors[activeIndex];

  return (
    <div className="relative z-10 flex flex-1 flex-col items-center">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-10 px-6 py-16 sm:px-10">
        <header className="flex flex-col items-center gap-4 text-center">
          <span className="font-display text-xs uppercase tracking-[0.5em] text-[color:var(--color-gold-soft)]">
            ✦  An Atlas of Imagined Worlds  ✦
          </span>
          <h1 className="gold-text font-display text-5xl font-bold leading-tight sm:text-6xl">
            StoryTeller
          </h1>
          <Ornament className="h-4 w-72 text-[color:var(--color-gold-soft)]" />
          <p className="max-w-xl text-lg italic text-[color:var(--color-mist)]/80">
            Whisper a single spark of an idea — receive a four-page illustrated
            tale, conjured by Claude and painted by Gemini.
          </p>
        </header>

        <section className="glass flex flex-col gap-5 rounded-2xl p-6 sm:p-8">
          <label className="flex flex-col gap-2">
            <span className="font-display text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-soft)]">
              Story Idea
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A retired lighthouse keeper finds a message in a bottle addressed to her younger self..."
              rows={4}
              className="input-mystic w-full resize-y rounded-lg px-4 py-3 text-base leading-relaxed"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="font-display text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-soft)]">
                Genre
              </span>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="input-mystic rounded-lg px-3 py-2.5 text-base"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g} className="bg-[color:var(--color-ink-2)]">
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="font-display text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-soft)]">
                Length per page
              </span>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as Length)}
                className="input-mystic rounded-lg px-3 py-2.5 text-base"
              >
                <option value="short" className="bg-[color:var(--color-ink-2)]">
                  Short
                </option>
                <option value="medium" className="bg-[color:var(--color-ink-2)]">
                  Medium
                </option>
                <option value="long" className="bg-[color:var(--color-ink-2)]">
                  Long
                </option>
              </select>
            </label>
          </div>

          <button
            onClick={generate}
            disabled={storyLoading || !prompt.trim()}
            className="btn-gold mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-full px-8 font-display text-sm font-semibold uppercase tracking-[0.25em]"
          >
            {storyLoading ? (
              <>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
                Spinning the tale...
              </>
            ) : (
              <>✦ Conjure Tale ✦</>
            )}
          </button>

          {error && (
            <p className="rounded-lg border border-rose-400/40 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          )}
        </section>

        {hasStory && current && (
          <article
            key={activeIndex}
            className="parchment fade-in flex flex-col overflow-hidden rounded-2xl"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-[color:var(--color-ink-2)]">
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage}
                  alt={`Illustration for page ${activeIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : currentImageError ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-rose-200">
                  <span>Image failed: {currentImageError}</span>
                  <button
                    onClick={() => {
                      setImageErrors((prev) => {
                        const next = [...prev];
                        next[activeIndex] = null;
                        return next;
                      });
                      fetchImage(activeIndex, current.imagePrompt, genre);
                    }}
                    className="btn-ghost-gold rounded-full px-4 py-1 text-xs"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="shimmer flex h-full w-full items-center justify-center text-sm tracking-[0.3em] text-[color:var(--color-gold-soft)]">
                  ✦ painting page {activeIndex + 1} ✦
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-[color:var(--color-gold)]/30" />
            </div>

            <div className="flex flex-col gap-5 p-7 sm:p-10">
              <div className="flex items-center justify-center gap-3">
                <span className="font-display text-[10px] uppercase tracking-[0.5em] text-[color:var(--color-gold-deep)]">
                  Page {activeIndex + 1}
                </span>
              </div>

              <p className="whitespace-pre-wrap font-serif-fancy text-[1.15rem] leading-8 text-[color:var(--color-parchment-ink)] first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-5xl first-letter:font-bold first-letter:leading-none first-letter:text-[color:var(--color-gold-deep)]">
                {current.text}
              </p>

              <div className="parchment-divider mt-2">
                <span>✦</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={toggleNarration}
                  disabled={audioLoading[activeIndex]}
                  className="inline-flex h-9 items-center gap-2 rounded-full border border-[color:var(--color-gold-deep)]/40 bg-[color:var(--color-gold)]/10 px-4 font-display text-[11px] uppercase tracking-[0.25em] text-[color:var(--color-gold-deep)] transition hover:bg-[color:var(--color-gold)]/20 disabled:cursor-wait disabled:opacity-60"
                >
                  {audioLoading[activeIndex] ? (
                    <>
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
                      Summoning voice...
                    </>
                  ) : audioPlaying ? (
                    <>■ Stop</>
                  ) : audioUrls[activeIndex] ? (
                    <>▶ Replay narration</>
                  ) : (
                    <>♪ Listen</>
                  )}
                </button>
                <audio
                  ref={audioRef}
                  onEnded={() => setAudioPlaying(false)}
                  onPause={() => setAudioPlaying(false)}
                  onPlay={() => setAudioPlaying(true)}
                  className="hidden"
                />
                {audioError && (
                  <p className="text-xs text-rose-700">{audioError}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                  className="btn-ghost-gold inline-flex h-10 items-center rounded-full px-5 font-display text-xs uppercase tracking-[0.25em]"
                >
                  ← Prev
                </button>

                <div className="flex items-center gap-2.5">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Go to page ${i + 1}`}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        i === activeIndex
                          ? "bg-[color:var(--color-gold)] shadow-[0_0_10px_rgba(245,201,122,0.7)]"
                          : "bg-[color:var(--color-parchment-shadow)]/60 hover:bg-[color:var(--color-gold-soft)]"
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => setActiveIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={activeIndex === total - 1}
                  className="btn-ghost-gold inline-flex h-10 items-center rounded-full px-5 font-display text-xs uppercase tracking-[0.25em]"
                >
                  Next →
                </button>
              </div>
            </div>
          </article>
        )}

        <footer className="mt-auto pt-8 text-center font-display text-[10px] uppercase tracking-[0.4em] text-[color:var(--color-gold-deep)]/70">
          Forged in starlight · {new Date().getFullYear()}
        </footer>
      </main>
    </div>
  );
}
