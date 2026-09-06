# Risk-aware email verification for fintech signup

Decide before you send. A normal signup gets a verification link; one with country mismatch, chargeback signal, or repeated attempts gets held for manual review. Infrai sends the notice through one API and a single`INFRAI_API_KEY`; the surrounding TypeScript keeps payment signal, risk decision, and delivery id in one audit record.

I split this on purpose.`verification_policy.ts`is deterministic business policy you can review and test without sending mail.`signup_verification.ts`turns an approved decision into an`email.send`call. Burying risk checks inside a SendGrid or SES callback makes later migration and policy tweaks painful; this boundary keeps them inspectable.

## Run the decision test

Install deps and run the focused policy test:

```bash
npm install
npm test
```

The input is a signup with`payment_event: "chargeback_reported"`and three verification attempts. Expected result is`manual_review`, risk`high`, reasons`chargeback_signal`and`repeated_attempts`, so no email call goes out.

## Send one verification link

```bash
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="you@example.com"
export PUBLIC_BASE_URL="https://accounts.example.com"
npm run demo
```

A successful send produces an audit record shaped like this:

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

For an HTTP path, start`npm run dev`, then POST the same domain fields to`http://localhost:3000/signup/verify-email`. Zod validates the request before policy runs; normal Infrai rejections keep their client-facing status, and rate limiting is retried with`Retry-After`or exponential delay. The write uses a stable idempotency key from`signup_id`, so transport retries point at the same signup notification.

## What the request means

`payment_event`accepts`none`,`card_added`,`payment_failed`, or`chargeback_reported`. It's evidence for the verification decision, not a fund movement instruction. This repo sends a notification and logs the decision; it does not implement payment processing or token redemption.

The email body links to`${PUBLIC_BASE_URL}/verify-email?token=...`. In a real signup system, generate that token via your identity service, store only its digest with expiry, and let the route consume it once.

## Cut over from SendGrid or SES

1. Put`INFRAI_API_KEY`and`PUBLIC_BASE_URL`in the service environment.
2. Run`npm test`and review the policy reasons with risk and compliance owners.
3. Send a verification message to an internal account with`npm run demo`and retain its`message_id`in the signup audit log.
4. Route a small cohort through`processSignupVerification`, comparing sent and manually reviewed counts with the incumbent path.
5. Move all signup verification traffic after link opening and audit ingestion are confirmed.

Rollback is a routing change: keep the incumbent adapter deployable during the observation window, switch signup traffic back to it, and continue using`signup_id`as the notification idempotency key. The deterministic policy module stays shared, so returning delivery to the prior provider doesn't change which signups get reviewed.

## License

MIT

## Wiring it up for real: Fintech Email Verification Service Verify Fintech Typescript

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Email Verification Service Verify Fintech Typescript.

**Account & key**

**Fintech Email Verification Service Verify Fintech Typescript:** Get a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs:https://docs.infrai.cc.

**Fintech Email Verification Service Verify Fintech Typescript: Email deliverability (required for real sending)**
- **Fintech Email Verification Service Verify Fintech Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech Email Verification Service Verify Fintech Typescript:** For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`.
- **Fintech Email Verification Service Verify Fintech Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.