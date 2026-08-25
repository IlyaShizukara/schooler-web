const HTML_TAG_RE = /<\s*\/?\s*[a-zA-Z][a-zA-Z0-9]*(?:\s[^>]*)?>/;
const IMG_SRC_RE = /(<img[^>]*\bsrc=")([^"]+)(")/gi;
const AUDIO_SRC_RE = /(<(?:audio|source)[^>]*\bsrc=")([^"]+\.(?:mp3|wav|ogg|m4a|aac)(?:\?[^"]*)?)(")/gi;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}

export function proxiedMediaUrl(rawUrl: string): string {
  const resolved = resolveImageUrl(rawUrl);
  return `${API_BASE.replace(/\/$/, "")}/api/media-proxy?url=${encodeURIComponent(resolved)}`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Аналог _question_to_mathjax_html из Flet: HTML остаётся HTML (с проксированными
 * src у картинок/аудио), обычный текст экранируется и переносы строк -> <br>.
 * В обоих случаях $$...$$ -> \[...\], $...$ -> \(...\) для MathJax. */
export function toMathJaxHtml(raw: string): string {
  const text = raw ?? "";
  const hasHtml = HTML_TAG_RE.test(text);

  let body: string;
  if (hasHtml) {
    body = text.replace(IMG_SRC_RE, (_m, pre, url, post) => `${pre}${proxiedMediaUrl(url)}${post}`);
    body = body.replace(AUDIO_SRC_RE, (_m, pre, url, post) => `${pre}${proxiedMediaUrl(url)}${post}`);
  } else {
    body = escapeHtml(text);
  }

  body = body.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr) => `\\[${expr}\\]`);
  body = body.replace(/\$(.+?)\$/g, (_m, expr) => `\\(${expr}\\)`);

  if (!hasHtml) {
    body = body.replace(/\n/g, "<br>");
  }

  return body;
}