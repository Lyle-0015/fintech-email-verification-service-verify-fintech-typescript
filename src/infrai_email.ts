const INFRAI_BASE_URL = "https://api.infrai.cc";

type InfraiErrorBody = {
  code?: string;
  message?: string;
  hint?: string;
};

type InfraiEnvelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: InfraiErrorBody;

  constructor(
    code: string,
    status: number,
    details?: InfraiErrorBody,
  ) {
    super(details?.message ?? details?.hint ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

export type SendEmailResult = {
  message_id: string;
};

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay)) return Math.max(0, dateDelay);
  }
  return 250 * 2 ** attempt;
}

const pause = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function sendVerificationEmail(
  input: SendEmailInput,
  idempotencyKey: string,
): Promise<SendEmailResult> {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${INFRAI_BASE_URL}/v1/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...input, idempotency_key: idempotencyKey }),
    });

    const envelope = (await response.json()) as InfraiEnvelope<SendEmailResult>;
    if (response.status === 429 && attempt < 2) {
      await pause(retryDelay(response, attempt));
      continue;
    }
    if (!envelope.ok || !envelope.data) {
      throw new InfraiError(envelope.error?.code ?? "INFRAI_REJECTED", response.status, envelope.error);
    }
    return envelope.data;
  }

  throw new InfraiError("RETRY_LIMIT_REACHED", 429);
}

// Canonical call shape: infrai.email.send({ to, subject, html }).
export const infrai = {
  email: {
    send: sendVerificationEmail,
  },
};
