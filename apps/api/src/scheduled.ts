import type { ScheduledEvent, Context } from "aws-lambda";
import { processDueReviewEmails } from "./handlers/review-emails";
import { processAbandonedCartEmails } from "./handlers/abandoned-cart-emails";

/** EventBridge Schedule — review emails (hourly check) + abandoned cart recovery (every 15 min). */
export async function handler(_event: ScheduledEvent, _context: Context) {
  const results: Record<string, unknown> = {};

  try {
    results.reviewEmails = await processDueReviewEmails();
  } catch (err) {
    console.error("Review emails cron failed:", err);
    results.reviewEmailsError = err instanceof Error ? err.message : String(err);
  }

  try {
    results.abandonedCartEmails = await processAbandonedCartEmails();
  } catch (err) {
    console.error("Abandoned cart emails cron failed:", err);
    results.abandonedCartEmailsError = err instanceof Error ? err.message : String(err);
  }

  if (results.reviewEmailsError || results.abandonedCartEmailsError) {
    throw new Error(JSON.stringify(results));
  }

  return results;
}
