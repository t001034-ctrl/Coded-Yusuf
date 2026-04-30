"use client";

import { useState } from "react";

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

  function reset() {
    setPages([]);
    setImages([]);
    setImageErrors([]);
    setActiveIndex(0);
    setError(null);
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
    <div className="flex flex-1 flex-col items-center bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            StoryTeller
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Describe an idea — get a four-page illustrated story.
          </p>
        </header>

        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Story idea
            </span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A retired lighthouse keeper finds a message in a bottle addressed to her younger self..."
              rows={4}
              className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-300"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Genre
              </span>
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-300"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Length per page
              </span>
              <select
                value={length}
                onChange={(e) => setLength(e.target.value as Length)}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-300"
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
          </div>

          <button
            onClick={generate}
            disabled={storyLoading || !prompt.trim()}
            className="mt-2 inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {storyLoading ? "Spinning the tale..." : "Generate story"}
          </button>

          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
        </section>

        {hasStory && current && (
          <article className="flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="relative aspect-video w-full bg-zinc-100 dark:bg-zinc-950">
              {currentImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentImage}
                  alt={`Illustration for page ${activeIndex + 1}`}
                  className="h-full w-full object-cover"
                />
              ) : currentImageError ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-4 text-center text-sm text-red-700 dark:text-red-300">
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
                    className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
                  Painting page {activeIndex + 1}...
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 p-6">
              <p className="whitespace-pre-wrap leading-7 text-zinc-800 dark:text-zinc-200">
                {current.text}
              </p>

              <div className="mt-2 flex items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <button
                  onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                  disabled={activeIndex === 0}
                  className="inline-flex h-9 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-2">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`Go to page ${i + 1}`}
                      className={`h-2.5 w-2.5 rounded-full transition ${
                        i === activeIndex
                          ? "bg-zinc-900 dark:bg-zinc-100"
                          : "bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Page {activeIndex + 1} of {total}
                  </span>
                </div>

                <button
                  onClick={() => setActiveIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={activeIndex === total - 1}
                  className="inline-flex h-9 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  Next →
                </button>
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
