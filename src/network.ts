export interface SendOptions {
  url: string;
  apiKey: string;
  body: string;
  keepalive?: boolean;
  fetchFn?: typeof globalThis.fetch;
}

/**
 * Sends batch JSON via HTTP POST to the analytics endpoint.
 * Returns true if response HTTP status is 200.
 */
export async function sendHttpPost(options: SendOptions): Promise<boolean> {
  const { url, apiKey, body, keepalive = false, fetchFn } = options;
  const actualFetch = fetchFn || (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined);

  if (!actualFetch) {
    if (typeof console !== 'undefined') {
      console.error('[Analytics] No fetch implementation available.');
    }
    return false;
  }

  try {
    const res = await actualFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body,
      keepalive,
    });

    if (res.status === 200) {
      return true;
    }

    if (typeof console !== 'undefined') {
      const text = await res.text().catch(() => '');
      console.error(`[Analytics] Server returned HTTP ${res.status}: ${text}`);
    }
    return false;
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.error('[Analytics] Network error:', err);
    }
    return false;
  }
}
