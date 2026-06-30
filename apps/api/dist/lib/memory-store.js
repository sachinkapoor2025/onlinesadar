"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStore = void 0;
exports.clearMemoryStore = clearMemoryStore;
exports.getMemoryStoreSize = getMemoryStoreSize;
const tables = new Map();
function tableFor(name) {
    const key = name ?? "default";
    let t = tables.get(key);
    if (!t) {
        t = new Map();
        tables.set(key, t);
    }
    return t;
}
function itemKey(pk, sk) {
    return `${pk}::${sk}`;
}
function indexAttrs(indexName) {
    if (!indexName)
        return { pk: "PK", sk: "SK" };
    return { pk: `${indexName}PK`, sk: `${indexName}SK` };
}
function matchKeyCondition(item, indexName, keyCondition, values, names) {
    if (!keyCondition || !values)
        return true;
    const { pk, sk } = indexAttrs(indexName);
    const resolve = (placeholder) => values[placeholder.trim()];
    // partition key: "<pk> = :x"
    const pkMatch = keyCondition.match(/(\w+)\s*=\s*(:\w+)/);
    if (pkMatch) {
        const attr = names?.[pkMatch[1]] ?? pkMatch[1];
        const targetAttr = attr.startsWith("#") || attr === pkMatch[1] ? pk : attr;
        if (item[targetAttr] !== resolve(pkMatch[2]))
            return false;
    }
    // sort key conditions
    const beginsWith = keyCondition.match(/begins_with\(\s*\w*?(SK)\s*,\s*(:\w+)\s*\)/i);
    if (beginsWith) {
        if (!String(item[sk] ?? "").startsWith(String(resolve(beginsWith[2]))))
            return false;
    }
    const skEq = keyCondition.match(new RegExp(`${sk}\\s*=\\s*(:\\w+)`));
    if (skEq) {
        if (item[sk] !== resolve(skEq[1]))
            return false;
    }
    return true;
}
function evalFilter(item, expression, values, names) {
    if (!expression)
        return true;
    const v = values ?? {};
    const n = names ?? {};
    // AND-joined simple clauses
    const clauses = expression.split(/\s+AND\s+/i);
    for (const clause of clauses) {
        const begins = clause.match(/begins_with\(\s*(\w+)\s*,\s*(:\w+)\s*\)/);
        if (begins) {
            const attr = n[begins[1]] ?? begins[1];
            if (!String(item[attr] ?? "").startsWith(String(v[begins[2]])))
                return false;
            continue;
        }
        const gt = clause.match(/(#?\w+)\s*>\s*(:\w+)/);
        if (gt) {
            const attr = n[gt[1]] ?? gt[1];
            if (!(Number(item[attr] ?? 0) > Number(v[gt[2]])))
                return false;
            continue;
        }
        const eq = clause.match(/(#?\w+)\s*=\s*(:\w+)/);
        if (eq) {
            const attr = n[eq[1]] ?? eq[1];
            if (item[attr] !== v[eq[2]])
                return false;
            continue;
        }
    }
    return true;
}
function splitTopLevel(input) {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const char of input) {
        if (char === "(")
            depth++;
        if (char === ")")
            depth--;
        if (char === "," && depth === 0) {
            parts.push(current);
            current = "";
        }
        else {
            current += char;
        }
    }
    if (current.trim())
        parts.push(current);
    return parts;
}
function applyUpdate(item, input) {
    const updated = { ...item };
    const values = input.ExpressionAttributeValues ?? {};
    const names = input.ExpressionAttributeNames ?? {};
    const expr = input.UpdateExpression ?? "";
    const resolveName = (raw) => names[raw.trim()] ?? raw.trim();
    const resolveOperand = (raw) => {
        const token = raw.trim();
        if (token.startsWith(":"))
            return values[token];
        const listAppend = token.match(/^list_append\((.+),(.+)\)$/);
        if (listAppend) {
            const a = resolveOperand(listAppend[1]);
            const b = resolveOperand(listAppend[2]);
            return [...(a ?? []), ...(b ?? [])];
        }
        const ifNotExists = token.match(/^if_not_exists\((.+),(.+)\)$/);
        if (ifNotExists) {
            const attr = resolveName(ifNotExists[1]);
            return updated[attr] ?? resolveOperand(ifNotExists[2]);
        }
        return updated[resolveName(token)];
    };
    const setMatch = expr.match(/SET\s+(.+?)(?:\s+ADD\s+|\s+REMOVE\s+|$)/is);
    if (setMatch) {
        for (const assignment of splitTopLevel(setMatch[1])) {
            const [lhs, rhs] = assignment.split("=");
            if (!lhs || rhs === undefined)
                continue;
            updated[resolveName(lhs)] = resolveOperand(rhs);
        }
    }
    const addMatch = expr.match(/ADD\s+(.+?)(?:\s+SET\s+|\s+REMOVE\s+|$)/is);
    if (addMatch) {
        for (const clause of splitTopLevel(addMatch[1])) {
            const tokens = clause.trim().split(/\s+/);
            if (tokens.length < 2)
                continue;
            const attr = resolveName(tokens[0]);
            const delta = Number(values[tokens[1]] ?? 0);
            updated[attr] = Number(updated[attr] ?? 0) + delta;
        }
    }
    return updated;
}
exports.memoryStore = {
    send: async (command) => {
        const name = command.constructor.name;
        const input = command.input;
        const store = tableFor(input.TableName);
        if (name === "PutCommand") {
            const { Item } = input;
            if (Item)
                store.set(itemKey(Item.PK, Item.SK), { ...Item });
            return {};
        }
        if (name === "GetCommand") {
            const { Key } = input;
            if (!Key)
                return { Item: undefined };
            const item = store.get(itemKey(Key.PK, Key.SK));
            return { Item: item ? { ...item } : undefined };
        }
        if (name === "DeleteCommand") {
            const { Key } = input;
            if (Key)
                store.delete(itemKey(Key.PK, Key.SK));
            return {};
        }
        if (name === "QueryCommand") {
            const q = input;
            let items = [...store.values()];
            items = items.filter((item) => matchKeyCondition(item, q.IndexName, q.KeyConditionExpression, q.ExpressionAttributeValues, q.ExpressionAttributeNames));
            items = items.filter((item) => evalFilter(item, q.FilterExpression, q.ExpressionAttributeValues, q.ExpressionAttributeNames));
            const { sk } = indexAttrs(q.IndexName);
            items.sort((a, b) => String(a[sk] ?? "").localeCompare(String(b[sk] ?? "")));
            if (q.ScanIndexForward === false)
                items.reverse();
            if (q.Limit)
                items = items.slice(0, q.Limit);
            return { Items: items };
        }
        if (name === "ScanCommand") {
            const s = input;
            let items = [...store.values()];
            items = items.filter((item) => evalFilter(item, s.FilterExpression, s.ExpressionAttributeValues, s.ExpressionAttributeNames));
            if (s.Limit)
                items = items.slice(0, s.Limit);
            return { Items: items };
        }
        if (name === "UpdateCommand") {
            const u = input;
            if (!u.Key)
                return {};
            const key = itemKey(u.Key.PK, u.Key.SK);
            const existing = store.get(key) ?? { PK: u.Key.PK, SK: u.Key.SK };
            const updated = applyUpdate(existing, u);
            store.set(key, updated);
            return { Attributes: updated };
        }
        return {};
    },
};
function clearMemoryStore() {
    tables.clear();
}
function getMemoryStoreSize() {
    let total = 0;
    for (const t of tables.values())
        total += t.size;
    return total;
}
