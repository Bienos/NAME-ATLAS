/**
 * The AI crawlers `robots.txt` names (TASK-175, ADR-0050), by the user-agent
 * tokens their vendors publish. Kept out of the route file, which Next.js
 * allows to export only its handlers and route config.
 */

/** Fetch a page to cite it in an AI answer: treated as a search engine. */
export const aiSearchAgents: readonly string[] = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
];

/** Collect pages to train models: refused, whatever the flag says. */
export const aiTrainingAgents: readonly string[] = [
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
  "Bytespider",
];
