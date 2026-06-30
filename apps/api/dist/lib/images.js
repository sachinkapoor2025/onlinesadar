"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveProductImageUrls = exports.resolveProductImageUrl = void 0;
exports.withResolvedProductImages = withResolvedProductImages;
const shared_1 = require("@onlinesadar/shared");
Object.defineProperty(exports, "resolveProductImageUrl", { enumerable: true, get: function () { return shared_1.resolveProductImageUrl; } });
Object.defineProperty(exports, "resolveProductImageUrls", { enumerable: true, get: function () { return shared_1.resolveProductImageUrls; } });
function withResolvedProductImages(item) {
    if (!item.images?.length)
        return item;
    return { ...item, images: (0, shared_1.resolveProductImageUrls)(item.images) };
}
