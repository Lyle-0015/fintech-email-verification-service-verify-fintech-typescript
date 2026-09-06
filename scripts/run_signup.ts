import { processSignupVerification } from "../src/signup_verification.ts";
import { signupRequestSchema } from "../src/verification_policy.ts";

const recipient = process.env.DEMO_EMAIL_TO;
if (!recipient) throw new Error("DEMO_EMAIL_TO is required");

const request = signupRequestSchema.parse({
  signup_id: `demo-${Date.now()}`,
  email: recipient,
  verification_token: "demo-verification-token-1234567890",
  account_country: "US",
  request_country: "US",
  payment_event: "card_added",
  verification_attempts: 0,
});

console.log(await processSignupVerification(request));
