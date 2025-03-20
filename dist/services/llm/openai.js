"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const promises_1 = __importDefault(require("fs/promises"));
const types_1 = require("../types");
class OpenAIService {
    constructor() {
        this.client = null;
        this.language = "Python";
        this.modelName = "gpt-4o";
    }
    async initialize(config) {
        if (!config.apiKey) {
            throw new types_1.LLMServiceError("OpenAI API key is required");
        }
        try {
            this.client = new openai_1.default({
                apiKey: config.apiKey.trim(),
            });
            this.language = config.language || "Python";
            this.modelName = config.modelName || "gpt-4o";
            console.log("OpenAI client initialized with model:", this.modelName);
        }
        catch (error) {
            console.error("Error initializing OpenAI client:", error);
            throw new types_1.LLMServiceError("Failed to initialize OpenAI client");
        }
    }
    async processScreenshots(screenshots) {
        if (!this.client) {
            throw new types_1.LLMServiceError("OpenAI client not initialized");
        }
        try {
            const messages = [
                {
                    role: "system",
                    content: `You are an expert coding interview assistant. Analyze the coding question from the screenshots and provide a solution in ${this.language}.
                   Return the response in the following JSON format:
                   {
                     "approach": "Detailed approach to solve the problem on how are we solving the problem, that the interviewee will speak out loud and in easy explainatory words",
                     "code": "The complete solution code",
                     "timeComplexity": "Big O analysis of time complexity with the reason",
                     "spaceComplexity": "Big O analysis of space complexity with the reason"
                   }`,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Here is a coding interview question. Please analyze and provide a solution.",
                        },
                    ],
                },
            ];
            // Add screenshots as image URLs
            for (const screenshot of screenshots) {
                const base64Image = await promises_1.default.readFile(screenshot.path, {
                    encoding: "base64",
                });
                messages.push({
                    role: "user",
                    content: [
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${base64Image}`,
                            },
                        },
                    ],
                });
            }
            // Get response from OpenAI
            const response = await this.client.chat.completions.create({
                model: this.modelName,
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7,
                response_format: { type: "json_object" },
            });
            const content = response.choices[0].message.content || "{}";
            return JSON.parse(content);
        }
        catch (error) {
            console.error("Error processing screenshots with OpenAI:", error);
            throw new types_1.LLMServiceError(`OpenAI processing error: ${error.message}`);
        }
    }
}
exports.OpenAIService = OpenAIService;
