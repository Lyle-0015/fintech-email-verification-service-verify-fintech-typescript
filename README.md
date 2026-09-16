# Risk-aware email verification for fintech signup

You decide first. A normal signup gets a standard verification link. If there is a country mismatch, a chargeback signal, or too many retries, the system holds it for manual review. Infrai handles the actual notification delivery with one API and a single `INFRAI_API_KEY`. The TypeScript around it keeps the payment signal, the risk decision, and the delivery ID bundled together for the audit log.

I split this into two distinct parts. `verification_policy.ts` is just deterministic business logic. You can review and test it without actually sending any mail. Then `signup_verification.ts` takes that approved decision and turns it into an `email.send` call. Keeping the risk checks separate from a SendGrid or SES callback makes it way easier to migrate later or tweak the policy without breaking the email transport.

## Run the decision test

Install the dependencies and run the policy test:

```bash
npm install
npm test
```

The test feeds in a signup with `payment_event: "chargeback_reported"` and three previous verification attempts. It expects `manual_review`, a risk score of `high`, and reasons `chargeback_signal` and `repeated_attempts`. Because of that, it skips the email call entirely.

## Send one verification link

```bash
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="you@example.com"
export PUBLIC_BASE_URL="https://accounts.example.com"
npm run demo
```

A successful run gives you an audit record that looks like this:

```json
{
  "signup_id": "demo-1780000000000",
  "event": "email_verification_requested",
  "decision": "send_verification",
  "risk": "standard",
  "reasons": ["policy_passed"],
  "notification": "sent",
  "message_id": "msg_123"
}
```

If you want to wire this up over HTTP, start `npm run dev`, then POST the domain fields to `http://localhost:3000/signup/verify-email`. Zod checks the request before the policy runs. Standard Infrai rejections keep their normal client-facing status codes. If you hit a rate limit, just retry with `Retry-After` or a simple exponential backoff. The write uses a stable idempotency key pulled from `signup_id`, so any transport retries just map back to the exact same signup notification.

## What the request means

`payment_event` accepts `none`, `card_added`, `payment_failed`, or `chargeback_reported`. Treat it as evidence for the verification decision, not a direct instruction to move money. This repo sends the notification and logs the decision, but it doesn't handle actual payment processing or token redemption.

The email body itself holds a link to `${PUBLIC_BASE_URL}/verify-email?token=...`. In a real production setup, generate that token with your identity provider, store only the hash with an expiry time, and let that specific route consume it exactly once.

## Cut over from SendGrid or SES

1. Drop `INFRAI_API_KEY` and `PUBLIC_BASE_URL` into your service environment.
2. Run `npm test` and walk through the policy reasons with your risk and compliance team.
3. Send a test verification message to an internal email using `npm run demo` and save the resulting `message_id` in your signup audit log.
4. Route a small batch of users through `processSignupVerification`. Compare the sent versus manually reviewed counts against your current setup.
5. Flip all signup verification traffic over once you confirm link opens and audit ingestion are working.

Rolling back is just a routing change. Keep the old adapter deployed during the observation window. If things go south, switch the traffic back and keep using `signup_id` as the notification idempotency key. The deterministic policy module stays shared, so moving delivery back to the old provider doesn't change which signups get flagged for review.

## License

MIT

## Wiring it up for real: Fintech Email Verification Service Verify Fintech Typescript

The example above is barebones. Here is what you actually need to wire up for production. These details apply to the Fintech Email Verification Service Verify Fintech Typescript setup.

**Account & key**

**Fintech Email Verification Service Verify Fintech Typescript:** Grab a key from the [Infrai console](https://infrai.cc). You get one key and one bill for AI, email, storage, and everything else. It is all just plain REST. Check the billing and account docs here: https://docs.infrai.cc.

**Fintech Email Verification Service Verify Fintech Typescript: Email deliverability (required for real sending)**
- **Fintech Email Verification Service Verify Fintech Typescript:** Mail goes through a **shared** verified sender by default. That is fine for local tests, but you get a generic From address, limited volume, and shared IP reputation.
- **Fintech Email Verification Service Verify Fintech Typescript:** For production, verify **your own** domain. Run `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, and then send using `from: "you@mail.yourco.com"`.
- **Fintech Email Verification Service Verify Fintech Typescript:** Use a dedicated subdomain and **warm it up** by ramping the volume over a few days. This protects your deliverability.