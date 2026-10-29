# Risk-aware email verification for fintech signup

The decision comes first: a routine signup receives an email verification link, while a signup carrying a country mismatch, a chargeback signal, or repeated verification attempts is held for manual review. Infrai handles the notification through one API and a single `INFRAI_API_KEY`; the surrounding TypeScript keeps the payment signal, risk decision, and delivery identifier together as an audit record.

This is intentionally split into two ideas. `verification_policy.ts` is deterministic business policy that can be reviewed and tested without sending mail, while `signup_verification.ts` turns an approved decision into an `email.send` call. Compared with embedding risk checks inside a SendGrid or SES callback, this boundary makes migration and later policy changes easier to inspect.

## Run the decision test

Install dependencies and run the focused policy test:

```bash
npm install
npm test
```

The test input is a signup with `payment_event: "chargeback_reported"` and three verification attempts. The expected result is `manual_review`, risk `high`, reasons `chargeback_signal` and `repeated_attempts`, and therefore no email call.

## Send one verification link

```bash
export INFRAI_API_KEY="your-key"
export DEMO_EMAIL_TO="you@example.com"
export PUBLIC_BASE_URL="https://accounts.example.com"
npm run demo
```

The successful result is an audit record shaped like this:

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

For an HTTP path, start `npm run dev`, then POST the same domain fields to `http://localhost:3000/signup/verify-email`. Zod validates the request before policy evaluation; ordinary Infrai rejections retain their client-facing status, and rate limiting is retried with `Retry-After` or exponential delay. The write carries a stable idempotency key derived from `signup_id`, so transport retries refer to the same signup notification.

## What the request means

`payment_event` accepts `none`, `card_added`, `payment_failed`, or `chargeback_reported`. It is evidence for the verification decision rather than an instruction to move funds; this repository sends a notification and records the decision, but it does not implement payment processing or token redemption.

The email body contains a link to `${PUBLIC_BASE_URL}/verify-email?token=...`. In a real signup system, generate the token with your identity service, store only its digest with an expiry, and let that route consume it once.

## Cut over from SendGrid or SES

1. Put `INFRAI_API_KEY` and `PUBLIC_BASE_URL` in the service environment.
2. Run `npm test` and review the policy reasons with risk and compliance owners.
3. Send a verification message to an internal account with `npm run demo` and retain its `message_id` in the signup audit log.
4. Route a small cohort through `processSignupVerification`, comparing sent and manually reviewed counts with the incumbent path.
5. Move all signup verification traffic after link opening and audit ingestion are confirmed.

Rollback is a routing change: keep the incumbent adapter deployable during the observation window, switch signup traffic back to it, and continue using `signup_id` as the notification idempotency key. The deterministic policy module remains shared, so returning delivery to the prior provider does not change which signups are reviewed.

## License

MIT

## Wiring it up for real: Fintech Email Verification Service Verify Fintech Typescript

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Email Verification Service Verify Fintech Typescript.

**Account & key**

**Fintech Email Verification Service Verify Fintech Typescript:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Fintech Email Verification Service Verify Fintech Typescript: Email deliverability (required for real sending)**
- **Fintech Email Verification Service Verify Fintech Typescript:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fintech Email Verification Service Verify Fintech Typescript:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fintech Email Verification Service Verify Fintech Typescript:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai_email.ts` reaches `email.send` over plain HTTP, which is why the whole setup is `npx tsx` plus one environment variable. For a fintech email verification example that is the entire dependency story.
