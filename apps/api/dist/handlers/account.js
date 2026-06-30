"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccount = getAccount;
exports.updateAccountProfile = updateAccountProfile;
exports.createAccountAddress = createAccountAddress;
exports.updateAccountAddress = updateAccountAddress;
exports.deleteAccountAddress = deleteAccountAddress;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const shared_1 = require("@onlinesadar/shared");
const db_1 = require("../lib/db");
const response_1 = require("../lib/response");
const auth_1 = require("../lib/auth");
async function getProfile(userId, email) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.GetCommand({
        TableName: db_1.CUSTOMERS_TABLE,
        Key: { PK: shared_1.accountKeys.pk(userId), SK: shared_1.accountKeys.profileSk() },
    }));
    if (result.Item)
        return result.Item;
    const timestamp = (0, db_1.now)();
    const profile = {
        userId,
        email,
        PK: shared_1.accountKeys.pk(userId),
        SK: shared_1.accountKeys.profileSk(),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.CUSTOMERS_TABLE, Item: profile }));
    return profile;
}
async function listAddresses(userId) {
    const result = await db_1.docClient.send(new lib_dynamodb_1.QueryCommand({
        TableName: db_1.CUSTOMERS_TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
            ":pk": shared_1.accountKeys.pk(userId),
            ":prefix": shared_1.accountKeys.addressSkPrefix(),
        },
    }));
    return (result.Items ?? []);
}
function toAddress(item) {
    return {
        id: item.id,
        label: item.label,
        isDefault: item.isDefault ?? false,
        name: item.name,
        line1: item.line1,
        line2: item.line2,
        city: item.city,
        state: item.state,
        postalCode: item.postalCode,
        country: item.country,
        phone: item.phone,
        email: item.email,
    };
}
async function clearDefaultAddresses(userId, addresses) {
    const timestamp = (0, db_1.now)();
    await Promise.all(addresses
        .filter((a) => a.isDefault)
        .map((a) => db_1.docClient.send(new lib_dynamodb_1.PutCommand({
        TableName: db_1.CUSTOMERS_TABLE,
        Item: { ...a, isDefault: false, updatedAt: timestamp },
    }))));
}
async function getAccount(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const profile = await getProfile(auth.userId, auth.email);
    const addressItems = await listAddresses(auth.userId);
    const addresses = addressItems
        .map(toAddress)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    const { PK: _pk, SK: _sk, ...profileData } = profile;
    return (0, response_1.ok)({ profile: profileData, addresses });
}
async function updateAccountProfile(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.accountProfileUpdateSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const existing = await getProfile(auth.userId, auth.email);
    const timestamp = (0, db_1.now)();
    const updated = {
        ...existing,
        ...parsed.data,
        email: auth.email,
        userId: auth.userId,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.CUSTOMERS_TABLE, Item: updated }));
    const { PK: _pk, SK: _sk, ...profileData } = updated;
    return (0, response_1.ok)({ profile: profileData });
}
async function createAccountAddress(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.accountAddressInputSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const existing = await listAddresses(auth.userId);
    const timestamp = (0, db_1.now)();
    const addressId = (0, uuid_1.v4)();
    const makeDefault = parsed.data.isDefault ?? existing.length === 0;
    if (makeDefault)
        await clearDefaultAddresses(auth.userId, existing);
    const item = {
        ...parsed.data,
        id: addressId,
        label: parsed.data.label ?? parsed.data.name,
        isDefault: makeDefault,
        PK: shared_1.accountKeys.pk(auth.userId),
        SK: shared_1.accountKeys.addressSk(addressId),
        createdAt: timestamp,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.CUSTOMERS_TABLE, Item: item }));
    return (0, response_1.created)({ address: toAddress(item) });
}
async function updateAccountAddress(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const addressId = event.pathParameters?.addressId;
    if (!addressId)
        return (0, response_1.badRequest)("Address ID required");
    const body = JSON.parse(event.body ?? "{}");
    const parsed = shared_1.accountAddressUpdateSchema.safeParse(body);
    if (!parsed.success)
        return (0, response_1.badRequest)(parsed.error.message);
    const existing = await listAddresses(auth.userId);
    const current = existing.find((a) => a.id === addressId);
    if (!current)
        return (0, response_1.notFound)("Address not found");
    const timestamp = (0, db_1.now)();
    if (parsed.data.isDefault)
        await clearDefaultAddresses(auth.userId, existing);
    const updated = {
        ...current,
        ...parsed.data,
        id: addressId,
        isDefault: parsed.data.isDefault ?? current.isDefault,
        updatedAt: timestamp,
    };
    await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.CUSTOMERS_TABLE, Item: updated }));
    return (0, response_1.ok)({ address: toAddress(updated) });
}
async function deleteAccountAddress(event) {
    const auth = (0, auth_1.getAuth)(event);
    if (!auth)
        return (0, response_1.unauthorized)();
    const addressId = event.pathParameters?.addressId;
    if (!addressId)
        return (0, response_1.badRequest)("Address ID required");
    const existing = await listAddresses(auth.userId);
    const current = existing.find((a) => a.id === addressId);
    if (!current)
        return (0, response_1.notFound)("Address not found");
    await db_1.docClient.send(new lib_dynamodb_1.DeleteCommand({
        TableName: db_1.CUSTOMERS_TABLE,
        Key: { PK: shared_1.accountKeys.pk(auth.userId), SK: shared_1.accountKeys.addressSk(addressId) },
    }));
    if (current.isDefault) {
        const remaining = existing.filter((a) => a.id !== addressId);
        if (remaining.length > 0) {
            const next = { ...remaining[0], isDefault: true, updatedAt: (0, db_1.now)() };
            await db_1.docClient.send(new lib_dynamodb_1.PutCommand({ TableName: db_1.CUSTOMERS_TABLE, Item: next }));
        }
    }
    return (0, response_1.ok)({ ok: true });
}
