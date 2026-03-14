const MAX_RESPONSE_BYTES = 512 * 1024; // 512 KB
const FETCH_TIMEOUT_MS = 15000;        // 15 seconds

export function validateUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS URLs are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();
  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]', 'metadata.google.internal'];
  if (blocked.includes(hostname) || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new Error('Internal/private URLs are not allowed');
  }

  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) || (a === 169 && b === 254)) {
      throw new Error('Private IP addresses are not allowed');
    }
  }

  return parsed;
}

export function htmlToText(html) {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>').replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

export async function fetchUrlContent(urlString) {
  const parsed = validateUrl(urlString);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NexusMSP-DocFetcher/1.0',
        'Accept': 'text/html, application/json, text/plain, */*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_RESPONSE_BYTES) {
      throw new Error(`Response too large (${contentLength} bytes). Maximum: ${MAX_RESPONSE_BYTES} bytes.`);
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_RESPONSE_BYTES) {
      throw new Error(`Response too large (${buffer.byteLength} bytes). Maximum: ${MAX_RESPONSE_BYTES} bytes.`);
    }

    const rawText = new TextDecoder().decode(buffer);
    const contentType = response.headers.get('content-type') || '';

    let text;
    if (contentType.includes('application/json')) {
      text = rawText;
    } else if (contentType.includes('text/html')) {
      text = htmlToText(rawText);
    } else {
      text = rawText;
    }

    return { text, contentType, url: parsed.toString() };
  } finally {
    clearTimeout(timeout);
  }
}
