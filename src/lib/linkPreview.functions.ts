import { createServerFn } from "@tanstack/react-start";

export type LinkPreview = { title: string | null; hostname: string };

const PRIVATE_HOSTNAME_RE =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|\[::1\]|\[fc|\[fd)/i;

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function extractTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  if (og?.[1]) return decodeHtmlEntities(og[1]).trim();
  const title = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (title?.[1]) return decodeHtmlEntities(title[1]).trim();
  return null;
}

export const fetchLinkPreview = createServerFn({ method: "GET" })
  .validator((url: string) => url)
  .handler(async ({ data: url }): Promise<LinkPreview> => {
    const hostname = extractHostname(url);
    const parsed = URL.parse(url);
    if (
      !parsed ||
      !/^https?:$/.test(parsed.protocol) ||
      PRIVATE_HOSTNAME_RE.test(parsed.hostname)
    ) {
      return { title: null, hostname };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
        },
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || !contentType.includes("text/html")) return { title: null, hostname };
      const html = await res.text();
      return { title: extractTitle(html), hostname };
    } catch {
      return { title: null, hostname };
    } finally {
      clearTimeout(timeout);
    }
  });
