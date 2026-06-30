"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSellerProfile = getSellerProfile;
exports.registerSeller = registerSeller;
exports.updateSellerProfile = updateSellerProfile;
exports.issueSellerTrialCoupon = issueSellerTrialCoupon;
exports.listAdminSellers = listAdminSellers;
exports.getPublicSeller = getPublicSeller;
const crypto_1 = require("crypto");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
function trialEndsAt() {
    const d = new Date();
    d.setDate(d.getDate() + shared_1.SELLER_TRIAL_DAYS);
    return d.toISOString();
}
function generateTrialCouponCode() {
    return `SELLER-${(0, crypto_1.randomBytes)(4).toString("hex").toUpperCase()}`;
}
async function getSellerByUserId(userId) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        IndexName: "GSI2",
        KeyConditionExpression: "GSI2PK = :pk AND GSI2SK = :sk",
        ExpressionAttributeValues: {
            ":pk": shared_1.sellerKeys.gsi2pk(userId),
            ":sk": shared_1.sellerKeys.gsi2sk(),
        },
        Limit: 1,
    }));
    return result.Items?.[0] ?? null;
}
async function getSellerProfile(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    return (0, response_1.ok)({ seller });
}
async function registerSeller(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const existing = await getSellerByUserId(auth.userId);
    if (existing)
        return (0, response_1.badRequest)("Seller account already exists");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.sellerRegisterSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    if (parsed.data.trialCouponCode) {
        const couponResult = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
            TableName: db_1.CONFIG_TABLE,
            Key: {
                PK: shared_1.sellerTrialCouponKeys.pk(parsed.data.trialCouponCode),
                SK: shared_1.sellerTrialCouponKeys.sk(),
            },
        }));
        const coupon = couponResult.Item;
        if (!coupon)
            return (0, response_1.badRequest)("Invalid trial coupon code");
        if (coupon.usedAt)
            return (0, response_1.badRequest)("Trial coupon already used");
        if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
            return (0, response_1.badRequest)("Trial coupon expired");
        }
        if (coupon.email && coupon.email !== auth.email.toLowerCase()) {
            return (0, response_1.badRequest)("Trial coupon is registered to a different email");
        }
        await db_1.docClient.send(new lib_dynamodb_1.UpdateCommand({
            TableName: db_1.CONFIG_TABLE,
            Key: {
                PK: shared_1.sellerTrialCouponKeys.pk(parsed.data.trialCouponCode),
                SK: shared_1.sellerTrialCouponKeys.sk(),
            },
            UpdateExpression: "SET usedAt = :at, userId = :uid",
            ExpressionAttributeValues: { ":at": (0, db_1.now)(), ":uid": auth.userId },
        }));
    }
    const sellerId = `sel_${(0, crypto_1.randomBytes)(8).toString("hex")}`;
    const slug = (0, db_1.slugify)(parsed.data.businessName);
    const timestamp = (0, db_1.now)();
    const { trialCouponCode: _coupon, ...profile } = parsed.data;
    const seller = {
        ...profile,
        sellerId,
        userId: auth.userId,
        email: auth.email,
        slug,
        status: shared_1.SELLER_STATUS.TRIAL_ACTIVE,
        subscriptionPlan: "trial",
        subscriptionStatus: "trial",
        bankVerified: false,
        documentsComplete: false,
        monthlyGmvInr: 0,
        productCount: 0,
        trialEndsAt: trialEndsAt(),
        PK: shared_1.sellerKeys.pk(sellerId),
        SK: shared_1.sellerKeys.sk(),
        GSI1PK: shared_1.sellerKeys.gsi1pk(),
        GSI1SK: timestamp,
        GSI2PK: shared_1.sellerKeys.gsi2pk(auth.userId),
        GSI2SK: shared_1.sellerKeys.gsi2sk(),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: seller }));
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.SELLERS_TABLE,
        Item: {
            PK: shared_1.sellerKeys.slugPk(slug),
            SK: shared_1.sellerKeys.slugSk(),
            sellerId,
            updatedAt: timestamp,
        },
    }));
    return (0, response_1.created)({ seller });
}
async function updateSellerProfile(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const seller = await getSellerByUserId(auth.userId);
    if (!seller)
        return (0, response_1.notFound)("Seller profile not found");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.sellerProfileUpdateSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const updated = {
        ...seller,
        ...parsed.data,
        updatedAt: (0, db_1.now)(),
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.SELLERS_TABLE, Item: updated }));
    return (0, response_1.ok)({ seller: updated });
}
/** Issue a 4-hour seller trial signup coupon (public — same pattern as welcome coupon). */
async function issueSellerTrialCoupon(event) {
    const body = JSON.parse(event.body ?? "{}");
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@"))
        return (0, response_1.badRequest)("Valid email required");
    const existingEmail = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.CONFIG_TABLE,
        Key: { PK: shared_1.sellerTrialCouponKeys.emailPk(email), SK: shared_1.sellerTrialCouponKeys.emailSk() },
    }));
    if (existingEmail.Item) {
        const active = existingEmail.Item;
        if (new Date(active.expiresAt).getTime() > Date.now()) {
            return (0, response_1.ok)({ code: active.code, expiresAt: active.expiresAt, reused: true });
        }
    }
    const code = generateTrialCouponCode();
    const expiresAt = new Date(Date.now() + shared_1.SELLER_TRIAL_COUPON_HOURS * 60 * 60 * 1000).toISOString();
    const timestamp = (0, db_1.now)();
    const couponItem = {
        code,
        email,
        expiresAt,
        createdAt: timestamp,
        PK: shared_1.sellerTrialCouponKeys.pk(code),
        SK: shared_1.sellerTrialCouponKeys.sk(),
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.CONFIG_TABLE,
        Item: {
            PK: shared_1.sellerTrialCouponKeys.emailPk(email),
            SK: shared_1.sellerTrialCouponKeys.emailSk(),
            code,
            expiresAt,
            createdAt: timestamp,
        },
    }));
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.CONFIG_TABLE, Item: couponItem }));
    return (0, response_1.created)({ code, expiresAt, hoursValid: shared_1.SELLER_TRIAL_COUPON_HOURS });
}
async function listAdminSellers(event) {
    if (!(0, auth_1.requireAdmin)(event))
        return (0, response_1.forbidden)();
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.SELLERS_TABLE,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": shared_1.sellerKeys.gsi1pk() },
        ScanIndexForward: false,
        Limit: 200,
    }));
    const sellers = (result.Items ?? []).filter((i) => i.sellerId);
    return (0, response_1.ok)({ sellers });
}
async function getPublicSeller(event) {
    const slug = event.pathParameters?.slug;
    if (!slug)
        return (0, response_1.badRequest)("Slug required");
    const slugRef = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.SELLERS_TABLE,
        Key: { PK: shared_1.sellerKeys.slugPk(slug), SK: shared_1.sellerKeys.slugSk() },
    }));
    if (!slugRef.Item?.sellerId)
        return (0, response_1.notFound)("Seller not found");
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.SELLERS_TABLE,
        Key: { PK: shared_1.sellerKeys.pk(slugRef.Item.sellerId), SK: shared_1.sellerKeys.sk() },
    }));
    if (!result.Item)
        return (0, response_1.notFound)("Seller not found");
    const seller = result.Item;
    if (seller.status === shared_1.SELLER_STATUS.SUSPENDED)
        return (0, response_1.notFound)("Seller not found");
    return (0, response_1.ok)({
        seller: {
            sellerId: seller.sellerId,
            slug: seller.slug,
            businessName: seller.businessName,
            businessType: seller.businessType,
            city: seller.city,
            state: seller.state,
            status: seller.status,
            productCount: seller.productCount,
        },
    });
}
