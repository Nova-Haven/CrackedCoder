"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMServiceError = void 0;
class LLMServiceError extends Error {
    constructor(message) {
        super(message);
        this.name = "LLMServiceError";
    }
}
exports.LLMServiceError = LLMServiceError;
