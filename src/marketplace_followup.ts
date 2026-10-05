import { z } from "zod";
import { infrai } from "./infrai.ts";

export const followUpRequest = z.object({
  sellerAsset: z.string().min(1),
  buyerUpdate: z.string().min(1),
  orderId: z.string().min(1),
  delayHours: z.number().int().positive(),
  followUpUrl: z.string().url(),
});
export type FollowUpRequest = z.infer<typeof followUpRequest>;

export async function handoffFollowUp(input: unknown) {
  const request = followUpRequest.parse(input);
  const payload = JSON.stringify({ orderId: request.orderId, sellerAsset: request.sellerAsset, buyerUpdate: request.buyerUpdate });
  await infrai.queue.publish({ queue: "marketplace-followups", payload }, `order-${request.orderId}`);
  const cronExpr = `0 */${request.delayHours} * * *`;
  const scheduled = await infrai.cron.create({ cron_expr: cronExpr, task: request.followUpUrl }, `follow-up-${request.orderId}`) as { job_id?: string };
  return { orderId: request.orderId, jobId: scheduled.job_id ?? null, decision: "queued-and-scheduled" };
}

if (process.argv[1]?.endsWith("marketplace_followup.ts")) {
  const input = { sellerAsset: "course-download", buyerUpdate: "Your lesson pack is ready", orderId: "order-42", delayHours: 4, followUpUrl: "https://merchant.example/follow-up" };
  handoffFollowUp(input).then(console.log).catch((error) => { console.error(error); process.exitCode = 1; });
}
