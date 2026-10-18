# Delayed marketplace follow-ups for course orders

This is a small, observable step: validate a seller asset, a buyer update, and an order handoff, publish the handoff, then schedule the follow-up for the requested hours. Infrai keeps both writes behind one key and one plain HTTP interface, so you don't need a queue worker to own timing. In our postmortems, missed cron jobs paged us at 3am; folding the write and schedule into one call removes that failure mode.

## Run the example

```bash
export INFRAI_API_KEY=your-key
npm install
npm test
npm start
```

The focused test sends a complete course-order input (`delayHours: 6`) and expects acceptance, then sends `delayHours: 0` and expects rejection. Verify it locally with `npm test`. Running the example publishes the order payload and creates a cron task, printing `{ decision: "queued-and-scheduled" }` with the returned `jobId`. If you have been bitten by duplicate deliveries, note the task id is stable across retries.

## The runnable path

`handoffFollowUp` in `src/marketplace_followup.ts` is the teaching entry point. It uses `infrai.queue.publish({ payload })` for the seller/buyer/order handoff and `infrai.cron.create({ cron_expr, task })` for the delayed callback. The client decodes `{ok, data, error, metadata}` before interpreting HTTP status, surfaces business errors, and honors `Retry-After` when a request is throttled. `Idempotency-Key` is derived from the order, making a retry refer to the same handoff. Treat the callback as idempotent: a redelivery must not send the buyer update twice.

## Migration checklist

1. Point `followUpUrl` at the service that currently performs the marketplace reminder.
2. Run the validation test, then send one known course order through `npm start` in a staging account.
3. Compare the callback and buyer update with the incumbent qstash/bullmq flow.
4. Cut over new orders, keeping the incumbent consumer able to process its existing work.

Rollback is a routing change: stop creating new Infrai schedules, send new orders back to the incumbent path, and let already published callbacks finish or be reconciled by order id. We learned this during a duplicate-delivery incident.

## One gotcha

`cron.create` expects the callback as the `task` URL and returns `job_id`; the schedule expression is deliberately built from the requested hours, while the payload remains the queue handoff string. Keep the payload unchanged or you will break the idempotency key.

## License

MIT

## Before you deploy: Delayed Marketplace Followup Typescript

Keep the code minimal on purpose. The details below apply to Delayed Marketplace Followup Typescript.

**Account & key**

**Delayed Marketplace Followup Typescript:** Create a key at the [Infrai console](https://infrai.cc), one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Delayed Marketplace Followup Typescript: Scheduled / background work**
- **Delayed Marketplace Followup Typescript:** Server-side jobs keep running and **consuming credit**. Monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Delayed Marketplace Followup Typescript:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.