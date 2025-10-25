import { RestClientOptions } from "./types";

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class RestClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly rateLimitMs: number;
  private readonly headers: Record<string, string>;
  private lastRequestAt = 0;

  constructor(options: RestClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://api-testnet.gte.xyz/v1").replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("A fetch implementation must be provided in non-browser environments");
    }
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
    this.rateLimitMs = options.rateLimitMs ?? 0;
    this.headers = { "Content-Type": "application/json", ...(options.headers ?? {}) };
  }

  private async rateLimit() {
    if (!this.rateLimitMs) return;
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.rateLimitMs) {
      await sleep(this.rateLimitMs - elapsed);
    }
    this.lastRequestAt = Date.now();
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, "")}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  private async request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
    await this.rateLimit();
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.fetchImpl(this.buildUrl(path, options.query), {
          method,
          body: options.body ? JSON.stringify(options.body) : undefined,
          headers: this.headers,
          signal: options.signal,
        });

        if (!response.ok) {
          const errorPayload = await safeJson(response);
          throw new Error(
            `GTE API ${method} ${path} failed with ${response.status}: ${JSON.stringify(errorPayload)}`,
          );
        }

        if (response.status === 204) {
          return undefined as T;
        }
        return (await safeJson(response)) as T;
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt > this.maxRetries) {
          throw error;
        }
        await sleep(this.retryDelayMs * attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unknown request failure");
  }

  get<T>(path: string, query?: RequestOptions["query"], signal?: AbortSignal) {
    return this.request<T>("GET", path, { query, signal });
  }
}

async function safeJson(response: Response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${(error as Error).message}`);
  }
}
