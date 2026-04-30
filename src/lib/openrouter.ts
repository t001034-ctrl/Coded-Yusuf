export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export function openRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "StoryTeller",
  };
}
