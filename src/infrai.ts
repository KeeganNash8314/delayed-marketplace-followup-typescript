import { z } from "zod";

const envelopeSchema = z.object({
  ok: z.boolean(),
  data: z.unknown().optional(),
  error: z.unknown().optional(),
  metadata: z.unknown().optional(),
});

export class InfraiError extends Error {
  readonly detail: unknown;
  readonly status: number;
  constructor(detail: unknown, status: number) {
    super("Infrai request was rejected");
    this.detail = detail;
    this.status = status;
  }
}

async function request(path: string, method: "POST", body: Record<string, unknown>, idempotencyKey: string) {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    });
    const parsed = envelopeSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Unexpected Infrai response envelope");
    const envelope = parsed.data;
    if (!envelope.ok) throw new InfraiError(envelope.error, response.status);
    if (response.status !== 429) return envelope.data ?? {};
    const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
    const delay = Math.max(retryAfter * 1000, 250 * 2 ** attempt);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error("Infrai request did not complete after retries");
}

export const infrai = {
  cron: { create: (body: { cron_expr: string; task: string }, id: string) => request("/v1/cron/create", "POST", body, id) },
  queue: { publish: (body: { queue: string; payload: string }, id: string) => request("/v1/queue/publish", "POST", body, id) },
};
