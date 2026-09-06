import assert from "node:assert/strict";
import test from "node:test";
import { decideVerification, signupRequestSchema } from "../src/verification_policy.ts";

test("a chargeback signal with repeated attempts requires manual review", () => {
  const request = signupRequestSchema.parse({
    signup_id: "signup-42",
    email: "ada@example.com",
    verification_token: "verification-token-1234567890",
    account_country: "US",
    request_country: "US",
    payment_event: "chargeback_reported",
    verification_attempts: 3,
  });

  assert.deepEqual(decideVerification(request), {
    action: "manual_review",
    risk: "high",
    reasons: ["chargeback_signal", "repeated_attempts"],
  });
});

test("a standard signup is approved for email verification", () => {
  const request = signupRequestSchema.parse({
    signup_id: "signup-43",
    email: "grace@example.com",
    verification_token: "verification-token-0987654321",
    account_country: "GB",
    request_country: "GB",
    payment_event: "card_added",
    verification_attempts: 0,
  });

  assert.equal(decideVerification(request).action, "send_verification");
});
