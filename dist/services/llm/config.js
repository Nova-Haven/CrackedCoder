"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const factory_1 = require("./factory");
let llmService = null;
async function updateConfig(config) {
    try {
        llmService = await factory_1.LLMServiceFactory.createService({
            provider: config.provider || "openai",
            apiKey: config.apiKey,
            language: config.language || "Python",
            modelName: config.modelName,
            endpoint: config.endpoint,
        });
    }
    catch (error) {
        console.error("Error initializing LLM service:", error);
        throw error;
    }
}
async function processScreenshots(screenshots) {
    if (!llmService) {
        throw new Error("LLM service not initialized. Please configure your API settings first. Click CTRL/CMD + P to open settings.");
    }
    try {
        return await llmService.processScreenshots(screenshots);
    }
    catch (error) {
        console.error("Error processing screenshots:", error);
        throw error;
    }
}
exports.default = {
    processScreenshots,
    updateConfig,
};
