import assert from "node:assert/strict";
import { followUpRequest } from "./marketplace_followup.ts";

const accepted = followUpRequest.safeParse({ sellerAsset: "video-lesson", buyerUpdate: "Watch lesson 3", orderId: "o-7", delayHours: 6, followUpUrl: "https://merchant.example/hook" });
assert.equal(accepted.success, true);
const rejected = followUpRequest.safeParse({ sellerAsset: "video-lesson", buyerUpdate: "Watch lesson 3", orderId: "o-7", delayHours: 0, followUpUrl: "https://merchant.example/hook" });
assert.equal(rejected.success, false);
console.log("follow-up validation decision: accepted input schedules; zero-hour input is rejected");
