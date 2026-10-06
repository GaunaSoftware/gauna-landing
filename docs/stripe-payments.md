# TransGest payments

The public tariff in `src/config/commerce.mjs` comes from the owner's September
2026 PDF and Planner image. Control has been removed from the offer. Existing
landing page URLs, demo submission handler, blog and protected DeCA guide remain.

Official Stripe libraries provide Embedded Checkout on `/transgest/contratar/`.
The server accepts only a plan, billing cycle, reviewed-selection flag and request
UUID. It retrieves and validates Stripe prices in EUR cents, recurring interval
and exclusive tax behavior. The implantation line is a one-time price on the
initial subscription invoice. Stripe collects billing details and calculates tax.
No card fields or secret API keys are rendered by Astro.

The result page uses a signed HttpOnly browser cookie before querying payment
status. It shows success only when Stripe reports a completed and paid session.
The webhook verifies the original raw body using the official SDK, retrieves the
session, checks the plan's lines and active subscription, sends confirmation and
merchant handoff through the existing Resend provider, and records completion
in Stripe metadata. Resend idempotency keys protect retries between delivery and
the metadata update. Fulfillment is manual implantation and account preparation;
this landing repository does not provision TransGest application accounts.

## Activation

1. Verify the merchant identity, charges capability, fiscal head office, relevant
   VAT registrations and product tax classifications in the owner's Stripe account.
2. Keep the public catalog IDs in `src/config/stripe-catalog.mjs` matched to the
   verified amounts. Prices are exclusive of VAT; no client amount is accepted.
3. Create the endpoint `https://gauna.es/api/stripe/webhook` for
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`,
   API version `2026-09-30.endive`. Store its signing secret in Vercel Production.
4. Store the Stripe secret/restricted key and matching publishable key in Vercel
   Production. Restrict the key to current account read, tax settings read,
   price read, Checkout Session read/write, tax registration read and subscription read.
5. Keep the existing Resend key. Set `STRIPE_PAYMENTS_ENABLED=true` only after
   configuration has been checked; redeploy and verify the form loads. The key,
   webhook and payment checks fail closed when missing or inconsistent.
6. Use a separate test account/catalog to test actual card confirmation, 3DS,
   first invoice, annual renewal, delivery retries and cancellation before enabling
   live payments. Live charges are never an automated release test.

## Verification

`node --test tests/*.test.mjs` includes signed webhook and malicious-price tests
with no network or email. `tests/storefront-browser.mjs` checks the new demo,
four plan cards, selection summaries and disabled payment state at three widths.
The pre-existing DeCA and email browser tests and production guide checks remain.

Existing articles about comparing proposals are retained. The current offer page
now publishes the approved prices, monthly/yearly contracts, implementation costs
and variable extras explicitly authorized by the owner.
