"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRazorpayOrder = createRazorpayOrder;
exports.verifyRazorpayPayment = verifyRazorpayPayment;
exports.razorpayWebhook = razorpayWebhook;
const razorpay_1 = __importDefault(require("razorpay"));
const crypto_1 = __importDefault(require("crypto"));
const response_1 = require("../../lib/response");
const auth_1 = require("../../lib/auth");
const orders_1 = require("../orders");
function getRazorpayCredentials() {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.RAZOR_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET || process.env.RAZOR_KEY_SECRET;
    return { keyId, keySecret };
}
function getRazorpay() {
    const { keyId, keySecret } = getRazorpayCredentials();
    if (!keyId || !keySecret)
        return null;
    return new razorpay_1.default({ key_id: keyId, key_secret: keySecret });
}
async function createRazorpayOrder(order) {
    const razorpay = getRazorpay();
    const { keyId } = getRazorpayCredentials();
    const publishableKeyId = keyId ?? "rzp_dev_key";
    if (!razorpay) {
        return {
            razorpayOrderId: `order_dev_${order.orderId}`,
            keyId: publishableKeyId,
        };
    }
    const rpOrder = await razorpay.orders.create({
        amount: Math.round(order.total * 100),
        currency: order.currency,
        receipt: order.orderId,
        notes: { orderId: order.orderId },
    });
    return {
        razorpayOrderId: rpOrder.id,
        keyId: publishableKeyId,
    };
}
async function verifyRazorpayPayment(event) {
    const userKey = (0, auth_1.getUserOrSessionKey)(event);
    if (!userKey)
        return (0, response_1.unauthorized)("Session or auth required");
    const body = JSON.parse(event.body ?? "{}");
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = body;
    if (!orderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return (0, response_1.badRequest)("Missing payment verification fields");
    }
    const order = await (0, orders_1.getOrderById)(orderId);
    if (!order)
        return (0, response_1.badRequest)("Order not found");
    if (order.razorpayOrderId && order.razorpayOrderId !== razorpayOrderId) {
        return (0, response_1.badRequest)("Payment order mismatch");
    }
    const { keySecret } = getRazorpayCredentials();
    if (!keySecret) {
        await (0, orders_1.markOrderPaid)(orderId, { razorpayPaymentId });
        return (0, response_1.ok)({ verified: true, mode: "dev" });
    }
    const expected = crypto_1.default
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
    if (expected !== razorpaySignature) {
        return (0, response_1.badRequest)("Invalid payment signature");
    }
    await (0, orders_1.markOrderPaid)(orderId, { razorpayPaymentId });
    return (0, response_1.ok)({ verified: true });
}
async function razorpayWebhook(event) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret)
        return (0, response_1.ok)({ received: true, mode: "dev" });
    const signature = event.headers?.["x-razorpay-signature"];
    if (!signature)
        return (0, response_1.badRequest)("Missing signature");
    const expected = crypto_1.default
        .createHmac("sha256", secret)
        .update(event.body ?? "")
        .digest("hex");
    if (expected !== signature)
        return (0, response_1.badRequest)("Invalid signature");
    try {
        const payload = JSON.parse(event.body ?? "{}");
        if (payload.event === "payment.captured") {
            const orderId = payload.payload?.payment?.entity?.notes?.orderId;
            const paymentId = payload.payload?.payment?.entity?.id;
            if (orderId)
                await (0, orders_1.markOrderPaid)(orderId, { razorpayPaymentId: paymentId });
        }
        return (0, response_1.ok)({ received: true });
    }
    catch (err) {
        return (0, response_1.serverError)(String(err));
    }
}
