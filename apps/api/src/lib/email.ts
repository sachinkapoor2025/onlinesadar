import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Order, Product, CartItem } from "@onlinesadar/shared";
import type { LeadCaptureInput } from "@onlinesadar/shared";
import { WELCOME_DISCOUNT_PERCENT, LOW_STOCK_ALERT_EMAIL, ABANDONED_CART_DISCOUNT_PERCENT } from "@onlinesadar/shared";

const DEFAULT_NOTIFY = "order@usarakhi.com";
const SITE_NAME = "UsaRakhi";

export type EmailSendResult = {
  ok: boolean;
  error?: string;
  skipped?: boolean;
};

function smtpPassword(): string | undefined {
  return (
    process.env.SMTP_PASS?.trim() ||
    process.env.SMTP_PASSWORD?.trim() ||
    undefined
  );
}

function smtpConfigured(): boolean {
  const user = process.env.SMTP_USER?.trim() || DEFAULT_NOTIFY;
  return Boolean(user && smtpPassword());
}

function smtpUser(): string {
  return process.env.SMTP_USER?.trim() || DEFAULT_NOTIFY;
}

function smtpHosts(): string[] {
  const primary = process.env.SMTP_HOST?.trim();
  const extras = (process.env.SMTP_HOSTS ?? "mail.usarakhi.com,smtp.usarakhi.com")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const all = primary ? [primary, ...extras] : extras;
  return [...new Set(all)];
}

function transportConfigs(host: string): SMTPTransport.Options[] {
  const user = smtpUser();
  const pass = smtpPassword()!;
  const portEnv = process.env.SMTP_PORT?.trim();

  if (portEnv) {
    const port = Number(portEnv);
    const secure = process.env.SMTP_SECURE?.trim()
      ? process.env.SMTP_SECURE === "true"
      : port === 465;
    return [{ host, port, secure, auth: { user, pass } }];
  }

  return [
    { host, port: 465, secure: true, auth: { user, pass } },
    { host, port: 587, secure: false, auth: { user, pass }, requireTLS: true },
  ];
}

async function createWorkingTransporter() {
  const hosts = smtpHosts();
  let lastError: unknown;

  for (const host of hosts) {
    for (const config of transportConfigs(host)) {
      const transporter = nodemailer.createTransport({
        ...config,
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
        tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
      });

      try {
        await transporter.verify();
        return transporter;
      } catch (err) {
        lastError = err;
        console.error("SMTP verify failed", { host, port: config.port, err });
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("SMTP connection failed");
}

function notifyAddress(): string {
  return process.env.NOTIFY_EMAIL?.trim() || DEFAULT_NOTIFY;
}

function fromAddress(): string {
  return process.env.SMTP_FROM?.trim() || smtpUser() || notifyAddress();
}

export async function sendNewsletterEmails(input: {
  email: string;
  page?: string;
  metadata?: Record<string, string>;
  coupon?: { code: string; expiresAt: string; discountPercent: number };
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const coupon = input.coupon ?? {
    code: input.metadata?.couponCode ?? "",
    expiresAt: input.metadata?.couponExpiresAt ?? "",
    discountPercent: Number(input.metadata?.discountPercent ?? WELCOME_DISCOUNT_PERCENT),
  };

  const expiryLabel = coupon.expiresAt
    ? new Date(coupon.expiresAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : "4 hours";

  const adminText = [
    "Source: Newsletter / 10% welcome offer",
    `Email: ${input.email}`,
    coupon.code ? `Coupon: ${coupon.code}` : null,
    coupon.expiresAt ? `Expires: ${coupon.expiresAt}` : null,
    input.page ? `Page: ${input.page}` : null,
    input.metadata ? `Details: ${JSON.stringify(input.metadata)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const admin = await sendEmail({
    to: notifyAddress(),
    subject: `[${SITE_NAME}] New newsletter signup — ${input.email}`,
    text: adminText,
    replyTo: input.email,
  });
  if (!admin.ok) return admin;

  const customer = await sendEmail({
    to: input.email,
    subject: `Your 10% off code — ${SITE_NAME}`,
    text: `Thank you for joining UsaRakhi!

Your exclusive welcome discount:

  Coupon code: ${coupon.code}
  Discount: ${coupon.discountPercent}% off your first order
  Valid until: ${expiryLabel} (4 hours from signup)

Enter this code at checkout on https://www.usarakhi.com/checkout

Shop premium Rakhis with delivery to all 50 US states:
https://www.usarakhi.com/products

Raksha Bandhan 2026 is August 28 — order early for on-time delivery.

— ${SITE_NAME} Team
order@usarakhi.com`,
  });

  if (!customer.ok) {
    console.error("Newsletter welcome email failed:", customer.error);
    return customer;
  }

  return { ok: true };
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    console.warn("Email skipped: SMTP not configured");
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  try {
    const transporter = await createWorkingTransporter();
    await transporter.sendMail({
      from: `"${SITE_NAME}" <${fromAddress()}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text.replace(/\n/g, "<br>"),
      replyTo: opts.replyTo,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("sendEmail failed:", message);
    return { ok: false, error: message };
  }
}

function formatLeadSource(source?: string): string {
  switch (source) {
    case "contact":
      return "Contact form";
    case "newsletter":
      return "Newsletter / exit offer";
    case "chat":
      return "Chat widget";
    case "review":
      return "Customer review";
    case "checkout":
      return "Checkout";
    case "product":
      return "Product page";
    default:
      return source ?? "Website";
  }
}

export type ContactEmailInput = {
  name: string;
  email: string;
  phone?: string;
  message: string;
  page?: string;
};

export async function sendContactEmails(input: ContactEmailInput): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const adminText = [
    `Source: Contact form`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    input.page ? `Page: ${input.page}` : null,
    "",
    "Message:",
    input.message,
  ]
    .filter(Boolean)
    .join("\n");

  const admin = await sendEmail({
    to: notifyAddress(),
    subject: `[${SITE_NAME}] New contact enquiry from ${input.name}`,
    text: adminText,
    replyTo: input.email,
  });

  if (!admin.ok) return admin;

  const customer = await sendEmail({
    to: input.email,
    subject: `We received your message — ${SITE_NAME}`,
    text: `Hi ${input.name},

Thank you for contacting ${SITE_NAME}. We received your message and will reply as soon as possible (usually within 24 hours).

For urgent order help, WhatsApp us or email order@usarakhi.com.

— ${SITE_NAME} Team
https://www.usarakhi.com`,
  });

  if (!customer.ok) {
    console.error("Customer auto-reply failed:", customer.error);
  }

  return { ok: true };
}

export async function notifyAdminLead(lead: LeadCaptureInput): Promise<EmailSendResult> {
  const message = lead.metadata?.message?.trim();
  const isContact = lead.source === "contact";
  const isReview = lead.source === "review";

  if (isContact && lead.name && lead.email && message) {
    return sendContactEmails({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      message,
      page: lead.page,
    });
  }

  if (lead.source === "newsletter" && lead.email) {
    const coupon =
      lead.metadata?.couponCode && lead.metadata?.couponExpiresAt
        ? {
            code: lead.metadata.couponCode,
            expiresAt: lead.metadata.couponExpiresAt,
            discountPercent: Number(lead.metadata.discountPercent ?? WELCOME_DISCOUNT_PERCENT),
          }
        : undefined;
    return sendNewsletterEmails({
      email: lead.email,
      page: lead.page,
      metadata: lead.metadata,
      coupon,
    });
  }

  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured" };
  }

  const isEnquiry = isContact || isReview || Boolean(message);
  if (!isEnquiry) return { ok: true, skipped: true };

  const lines = [
    `Source: ${formatLeadSource(lead.source)}`,
    lead.name ? `Name: ${lead.name}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.phone ? `Phone: ${lead.phone}` : null,
    lead.page ? `Page: ${lead.page}` : null,
    lead.productSlug ? `Product: ${lead.productSlug}` : null,
    message ? `\nMessage:\n${message}` : null,
    lead.metadata && Object.keys(lead.metadata).length > 0
      ? `\nMetadata: ${JSON.stringify(lead.metadata, null, 2)}`
      : null,
    `\nSession: ${lead.sessionId}`,
  ]
    .filter(Boolean)
    .join("\n");

  return sendEmail({
    to: notifyAddress(),
    subject: `[${SITE_NAME}] New ${isReview ? "review" : "enquiry"} — ${formatLeadSource(lead.source)}`,
    text: lines,
    replyTo: lead.email,
  });
}

function formatOrderItems(order: Order): string {
  return order.items
    .map((i) => `- ${i.name} × ${i.quantity} — ${order.currency} ${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");
}

function formatAddress(order: Order): string {
  const a = order.shippingAddress;
  if (!a) return "—";
  return [
    a.name,
    a.line1,
    a.line2,
    `${a.city}, ${a.state} ${a.postalCode}`,
    a.country,
    a.phone ? `Phone: ${a.phone}` : null,
    a.email ? `Email: ${a.email}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildOrderAdminBody(order: Order, headline: string): string {
  return [
    headline,
    "",
    `Order ID: ${order.orderId}`,
    `Total: ${order.currency} ${order.total.toFixed(2)}`,
    `Payment method: ${order.paymentProvider ?? "—"}`,
    `Status: ${order.status}`,
    "",
    "Items:",
    formatOrderItems(order),
    "",
    "Ship to:",
    formatAddress(order),
    "",
    `Placed: ${order.createdAt}`,
  ].join("\n");
}

export async function notifyAdminOrderPlaced(order: Order): Promise<EmailSendResult> {
  return sendEmail({
    to: notifyAddress(),
    subject: `[${SITE_NAME}] New order placed — ${order.orderId.slice(0, 8)} (${order.currency} ${order.total.toFixed(2)})`,
    text: buildOrderAdminBody(
      order,
      `A customer placed a new order on ${SITE_NAME}. Payment may still be processing.`
    ),
    replyTo: order.shippingAddress?.email,
  });
}

export async function notifyAdminOrderPaid(order: Order): Promise<EmailSendResult> {
  const admin = await sendEmail({
    to: notifyAddress(),
    subject: `[${SITE_NAME}] ✅ Payment received — Order ${order.orderId.slice(0, 8)} (${order.currency} ${order.total.toFixed(2)})`,
    text: buildOrderAdminBody(order, `Payment confirmed — new order on ${SITE_NAME}`),
    replyTo: order.shippingAddress?.email,
  });

  if (!admin.ok) return admin;

  const customerEmail = order.shippingAddress?.email?.trim();
  if (customerEmail && customerEmail.includes("@")) {
    await sendEmail({
      to: customerEmail,
      subject: `Order confirmed — ${SITE_NAME}`,
      text: `Hi${order.shippingAddress?.name ? ` ${order.shippingAddress.name}` : ""},

Thank you for your order! Payment has been received.

Order ID: ${order.orderId}
Total: ${order.currency} ${order.total.toFixed(2)}

We deliver to all 50 US states in 5–7 business days after dispatch.

Questions? Reply to this email or WhatsApp us.

— ${SITE_NAME} Team`,
    });
  }

  return { ok: true };
}

export async function notifyLowStock(product: Product, inventory: number): Promise<EmailSendResult> {
  const soldOut = inventory <= 0;
  const subject = soldOut
    ? `[${SITE_NAME}] SOLD OUT — restock ${product.name}`
    : `[${SITE_NAME}] Low stock (${inventory} left) — ${product.name}`;

  const text = soldOut
    ? `Product sold out on ${SITE_NAME}

Product: ${product.name}
SKU: ${product.sku ?? "—"}
Slug: ${product.slug}
Category: ${product.categorySlug}
Current inventory: 0

Please restock this item in the admin portal (Products → edit stock).

Admin: https://www.usarakhi.com/admin/products`
    : `Low stock alert on ${SITE_NAME}

Product: ${product.name}
SKU: ${product.sku ?? "—"}
Slug: ${product.slug}
Category: ${product.categorySlug}
Current inventory: ${inventory} (threshold: 10 or below)

Please restock this item in the admin portal.

Admin: https://www.usarakhi.com/admin/products`;

  return sendEmail({
    to: LOW_STOCK_ALERT_EMAIL,
    subject,
    text,
  });
}

function siteUrl(): string {
  return (process.env.SITE_URL ?? "https://www.usarakhi.com").replace(/\/$/, "");
}

export async function sendReviewRequestEmail(order: Order): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured" };
  }

  const customerEmail = order.shippingAddress?.email?.trim();
  if (!customerEmail?.includes("@")) {
    return { ok: false, skipped: true, error: "No customer email" };
  }

  const name = order.shippingAddress?.name?.split(" ")[0] ?? "there";
  const shortId = order.orderId.slice(0, 8).toUpperCase();
  const reviewUrl = `${siteUrl()}/reviews`;

  const text = `Hi ${name},

We hope your Rakhi order #${shortId} arrived safely and made Raksha Bandhan special!

We're UsaRakhi — in our first Raksha Bandhan season — and your feedback helps other sisters trust us for USA Rakhi delivery.

Would you take 30 seconds to share your experience?
${reviewUrl}

You can mention delivery speed, packaging, or how your brother liked the Rakhi. We read every review.

Thank you for choosing ${SITE_NAME}.

— Team ${SITE_NAME}
${siteUrl()}
WhatsApp / support: support@usarakhi.com`;

  return sendEmail({
    to: customerEmail,
    subject: `How was your Rakhi delivery? — ${SITE_NAME}`,
    text,
    replyTo: notifyAddress(),
  });
}

function formatCartLines(items: CartItem[], currency: string): string {
  if (!items.length) return "  (items in your cart)";
  return items
    .map((i) => `  • ${i.quantity}× ${i.name} — ${i.currency ?? currency} ${(i.price * i.quantity).toFixed(2)}`)
    .join("\n");
}

export async function sendAbandonedCartEmail(input: {
  email: string;
  name: string;
  items: CartItem[];
  value: number;
  currency: string;
  couponCode: string;
  expiresAt: string;
  reminder: 1 | 2;
}): Promise<EmailSendResult> {
  if (!smtpConfigured()) {
    return { ok: false, skipped: true, error: "SMTP not configured on server" };
  }

  const expiryLabel = input.expiresAt
    ? new Date(input.expiresAt).toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "America/New_York",
      })
    : "4 hours";

  const cartLines = formatCartLines(input.items, input.currency);
  const totalLabel = `${input.currency} ${input.value.toFixed(2)}`;
  const reminderLine =
    input.reminder === 1
      ? "You left some beautiful Rakhis in your cart."
      : "Still thinking it over? Your cart is waiting — plus an extra nudge from us.";

  const text = `Hi ${input.name},

${reminderLine}

Your cart (${totalLabel}):
${cartLines}

Complete checkout with ${ABANDONED_CART_DISCOUNT_PERCENT}% off — use code ${input.couponCode} at checkout.
Valid until: ${expiryLabel}

→ https://www.usarakhi.com/cart
→ https://www.usarakhi.com/checkout

Raksha Bandhan 2026 is August 28 — order early for on-time USA delivery.

— ${SITE_NAME} Team
order@usarakhi.com`;

  return sendEmail({
    to: input.email,
    subject:
      input.reminder === 1
        ? `You left items in your cart — ${ABANDONED_CART_DISCOUNT_PERCENT}% off inside`
        : `Last chance: ${ABANDONED_CART_DISCOUNT_PERCENT}% off your cart (${input.couponCode})`,
    text,
  });
}
