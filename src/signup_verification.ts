import { infrai } from "./infrai_email.ts";
import { decideVerification, type SignupRequest, type VerificationDecision } from "./verification_policy.ts";

export type AuditRecord = {
  signup_id: string;
  event: "email_verification_requested";
  decision: VerificationDecision["action"];
  risk: VerificationDecision["risk"];
  reasons: string[];
  notification: "sent" | "withheld";
  message_id?: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

export async function processSignupVerification(input: SignupRequest): Promise<AuditRecord> {
  const decision = decideVerification(input);
  if (decision.action === "manual_review") {
    return {
      signup_id: input.signup_id,
      event: "email_verification_requested",
      decision: decision.action,
      risk: decision.risk,
      reasons: decision.reasons,
      notification: "withheld",
    };
  }

  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? "http://localhost:3000";
  const verificationUrl = new URL("/verify-email", publicBaseUrl);
  verificationUrl.searchParams.set("token", input.verification_token);
  const result = await infrai.email.send(
    {
      to: input.email,
      subject: "Verify your email for FinPay",
      html: `<p>Confirm your email to continue setting up your account.</p><p><a href="${escapeHtml(verificationUrl.toString())}">Verify email</a></p>`,
    },
    `signup-verification-${input.signup_id}`,
  );

  return {
    signup_id: input.signup_id,
    event: "email_verification_requested",
    decision: decision.action,
    risk: decision.risk,
    reasons: decision.reasons,
    notification: "sent",
    message_id: result.message_id,
  };
}
