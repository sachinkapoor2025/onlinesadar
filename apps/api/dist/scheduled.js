"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const review_emails_1 = require("./handlers/review-emails");
const abandoned_cart_emails_1 = require("./handlers/abandoned-cart-emails");
/** EventBridge Schedule — review emails (hourly check) + abandoned cart recovery (every 15 min). */
async function handler(_event, _context) {
    const results = {};
    try {
        results.reviewEmails = await (0, review_emails_1.processDueReviewEmails)();
    }
    catch (err) {
        console.error("Review emails cron failed:", err);
        results.reviewEmailsError = err instanceof Error ? err.message : String(err);
    }
    try {
        results.abandonedCartEmails = await (0, abandoned_cart_emails_1.processAbandonedCartEmails)();
    }
    catch (err) {
        console.error("Abandoned cart emails cron failed:", err);
        results.abandonedCartEmailsError = err instanceof Error ? err.message : String(err);
    }
    if (results.reviewEmailsError || results.abandonedCartEmailsError) {
        throw new Error(JSON.stringify(results));
    }
    return results;
}
