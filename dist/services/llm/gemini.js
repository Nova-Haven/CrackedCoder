"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const promises_1 = __importDefault(require("fs/promises"));
const types_1 = require("../types");
class GeminiService {
    constructor() {
        this.client = null;
        this.language = "Python";
        this.modelName = "gemini-pro-vision";
    }
    async initialize(config) {
        if (!config.apiKey) {
            throw new types_1.LLMServiceError("Gemini API key is required");
        }
        try {
            this.client = new generative_ai_1.GoogleGenerativeAI(config.apiKey.trim());
            this.language = config.language || "Python";
            this.modelName = config.modelName || "gemini-pro-vision";
            console.log("Gemini client initialized with model:", this.modelName);
        }
        catch (error) {
            console.error("Error initializing Gemini client:", error);
            throw new types_1.LLMServiceError("Failed to initialize Gemini client");
        }
    }
    async processScreenshots(screenshots) {
        if (!this.client) {
            throw new types_1.LLMServiceError("Gemini client not initialized");
        }
        try {
            const model = this.client.getGenerativeModel({ model: this.modelName });
            // Prepare images for Gemini
            const imageParts = await Promise.all(screenshots.map(async (screenshot) => {
                const imageBuffer = await promises_1.default.readFile(screenshot.path);
                return {
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: "image/png",
                    },
                };
            }));
            const prompt = `You are an expert coding interview assistant. Analyze the coding question from the images and provide a solution in ${this.language}.
                    Return the response in the following JSON format:
                    {
                      "approach": "Detailed approach to solve the problem on how are we solving the problem, that the interviewee will speak out loud and in easy explainatory words",
                      "code": "The complete solution code",
                      "timeComplexity": "Big O analysis of time complexity with the reason",
                      "spaceComplexity": "Big O analysis of space complexity with the reason"
                    }`;
            // Prepare message for Gemini
            const result = await model.generateContent([prompt, ...imageParts]);
            const response = result.response;
            const text = response.text();
            // Extract JSON from the response text
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : "{}";
                return JSON.parse(jsonString);
            }
            catch (parseError) {
                console.error("Error parsing Gemini response:", parseError);
                throw new types_1.LLMServiceError("Failed to parse Gemini response");
            }
        }
        catch (error) {
            console.error("Error processing screenshots with Gemini:", error);
            throw new types_1.LLMServiceError(`Gemini processing error: ${error.message}`);
        }
    }
}
exports.GeminiService = GeminiService;
