"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const axios_1 = __importDefault(require("axios"));
const types_1 = require("./llm/types");
class OllamaService {
    constructor() {
        this.endpoint = "http://localhost:11434/api";
        this.language = "Python";
        this.modelName = "llama3";
    }
    async initialize(config) {
        try {
            this.endpoint = config.endpoint || "http://localhost:11434/api";
            this.language = config.language || "Python";
            this.modelName = config.modelName || "llama3";
            // Test connection to Ollama
            await axios_1.default.get(`${this.endpoint}/version`);
            console.log("Ollama client initialized with model:", this.modelName);
        }
        catch (error) {
            console.error("Error initializing Ollama client:", error);
            throw new types_1.LLMServiceError("Failed to connect to Ollama API. Make sure Ollama is running.");
        }
    }
    async processScreenshots(screenshots) {
        try {
            // Prepare images for Ollama
            const imageParts = await Promise.all(screenshots.map(async (screenshot) => {
                const imageBuffer = await promises_1.default.readFile(screenshot.path);
                return {
                    data: imageBuffer.toString("base64"),
                    mimeType: "image/png",
                };
            }));
            const prompt = `You are an expert coding interview assistant. Analyze the coding question from the provided images and provide a solution in ${this.language}.
                      Return the response in the following JSON format:
                      {
                        "approach": "Detailed approach to solve the problem on how are we solving the problem, that the interviewee will speak out loud and in easy explainatory words",
                        "code": "The complete solution code",
                        "timeComplexity": "Big O analysis of time complexity with the reason",
                        "spaceComplexity": "Big O analysis of space complexity with the reason"
                      }
                      
                      Here is the coding interview question shown in the images:`;
            // Call Ollama API with prompt and images
            const response = await axios_1.default.post(`${this.endpoint}/generate`, {
                model: this.modelName,
                prompt: prompt,
                images: imageParts.map((p) => p.data),
                stream: false,
                format: "json",
            });
            // Extract JSON from response
            try {
                const text = response.data.response;
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonString = jsonMatch ? jsonMatch[0] : "{}";
                return JSON.parse(jsonString);
            }
            catch (parseError) {
                console.error("Error parsing Ollama response:", parseError);
                throw new types_1.LLMServiceError("Failed to parse Ollama response");
            }
        }
        catch (error) {
            console.error("Error processing screenshots with Ollama:", error);
            throw new types_1.LLMServiceError(`Ollama processing error: ${error.message}`);
        }
    }
}
exports.OllamaService = OllamaService;
