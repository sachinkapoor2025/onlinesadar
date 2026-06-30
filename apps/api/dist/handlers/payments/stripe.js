"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStripePaymentIntent = createStripePaymentIntent;
exports.stripeWebhook = stripeWebhook;
const stripe_1 = __importDefault(require("stripe"));
const response_1 = require("../../lib/response");
const orders_1 = require("../orders");
function getStripe() {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key)
        return null;
    return new stripe_1.default(key, { apiVersion: "2025-02-24.acacia" });
}
function getRawBody(event) {
    if (!event.body)
        return "";
    if (event.isBase64Encoded)
        return Buffer.from(event.body, "base64").toString("utf8");
    return event.body;
}
function getHeader(event, name) {
    const headers = event.headers ?? {};
    const lower = name.toLowerCase();
    return headers[lower] ?? headers[name];
}
async function createStripePaymentIntent(order) {
    const stripe = getStripe();
    if (!stripe) {
        return {
            paymentIntentId: `pi_dev_${order.orderId}`,
            clientSecret: `pi_dev_${order.orderId}_secret`,
        };
    }
    const intent = await stripe.paymentIntents.create({
        amount: Math.round(order.total * 100),
        currency: order.currency.toLowerCase(),
        metadata: { orderId: order.orderId },
        automatic_payment_methods: { enabled: true },
        ...(order.shippingAddress.email
            ? { receipt_email: order.shippingAddress.email.trim() }
            : {}),
    });
    return {
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
    };
}
async function stripeWebhook(event) {
    const stripe = getStripe();
    if (!stripe)
        return (0, response_1.ok)({ received: true, mode: "dev" });
    const sig = getHeader(event, "stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!sig || !webhookSecret) {
        return (0, response_1.badRequest)("Missing webhook signature");
    }
    const rawBody = getRawBody(event);
    try {
        const stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
        if (stripeEvent.type === "payment_intent.succeeded") {
            const intent = stripeEvent.data.object;
            const orderId = intent.metadata?.orderId;
            if (orderId) {
                await (0, orders_1.markOrderPaid)(orderId, { paymentIntentId: intent.id });
            }
        }
        return (0, response_1.ok)({ received: true });
    }
    catch (err) {
        console.error("Stripe webhook error:", err);
        return (0, response_1.serverError)(String(err));
    }
}
