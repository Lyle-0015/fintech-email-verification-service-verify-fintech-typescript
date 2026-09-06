import { z } from "zod";

export const signupRequestSchema = z.object({
  signup_id: z.string().min(1).max(100),
  email: z.string().email(),
  verification_token: z.string().min(20).max(256),
  account_country: z.string().length(2).toUpperCase(),
  request_country: z.string().length(2).toUpperCase(),
  payment_event: z.enum(["none", "card_added", "payment_failed", "chargeback_reported"]),
  verification_attempts: z.number().int().min(0).max(20),
});

export type SignupRequest = z.infer<typeof signupRequestSchema>;

export type VerificationDecision = {
  action: "send_verification" | "manual_review";
  risk: "standard" | "high";
  reasons: string[];
};

export function decideVerification(input: SignupRequest): VerificationDecision {
  const reasons: string[] = [];
  if (input.account_country !== input.request_country) reasons.push("country_mismatch");
  if (input.payment_event === "chargeback_reported") reasons.push("chargeback_signal");
  if (input.verification_attempts >= 3) reasons.push("repeated_attempts");

  return reasons.length > 0
    ? { action: "manual_review", risk: "high", reasons }
    : { action: "send_verification", risk: "standard", reasons: ["policy_passed"] };
}
