"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMServiceFactory = void 0;
const openai_1 = require("./openai");
const gemini_1 = require("./gemini");
const ollama_1 = require("./ollama");
class LLMServiceFactory {
    static async createService(config) {
        let service;
        switch (config.provider.toLowerCase()) {
            case "openai":
                service = new openai_1.OpenAIService();
                break;
            case "gemini":
                service = new gemini_1.GeminiService();
                break;
            case "ollama":
                service = new ollama_1.OllamaService();
                break;
            case "custom":
                // For custom APIs, we can extend this later
                service = new openai_1.OpenAIService();
                break;
            default:
                throw new Error(`Unsupported LLM provider: ${config.provider}`);
        }
        await service.initialize(config);
        return service;
    }
}
exports.LLMServiceFactory = LLMServiceFactory;
