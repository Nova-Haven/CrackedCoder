import { GoogleGenerativeAI, GenerationConfig } from "@google/generative-ai";
import fs from "fs/promises";
import {
  LLMConfig,
  LLMService,
  ProcessedSolution,
  LLMServiceError,
  Screenshot,
} from "../types";

export class GeminiService implements LLMService {
  private client: GoogleGenerativeAI | null = null;
  private language: string = "Python";
  private modelName: string = "gemini-pro-vision";

  async initialize(config: LLMConfig): Promise<void> {
    if (!config.apiKey) {
      throw new LLMServiceError("Gemini API key is required");
    }

    try {
      this.client = new GoogleGenerativeAI(config.apiKey.trim());
      this.language = config.language || "Python";
      this.modelName = config.modelName || "gemini-pro-vision";
      console.log("Gemini client initialized with model:", this.modelName);
    } catch (error) {
      console.error("Error initializing Gemini client:", error);
      throw new LLMServiceError("Failed to initialize Gemini client");
    }
  }

  async processScreenshots(
    screenshots: Screenshot[]
  ): Promise<ProcessedSolution> {
    if (!this.client) {
      throw new LLMServiceError("Gemini client not initialized");
    }

    try {
      const model = this.client.getGenerativeModel({ model: this.modelName });

      // Prepare images for Gemini
      const imageParts = await Promise.all(
        screenshots.map(async (screenshot) => {
          const imageBuffer = await fs.readFile(screenshot.path);
          return {
            inlineData: {
              data: imageBuffer.toString("base64"),
              mimeType: "image/png",
            },
          };
        })
      );

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
        return JSON.parse(jsonString) as ProcessedSolution;
      } catch (parseError) {
        console.error("Error parsing Gemini response:", parseError);
        throw new LLMServiceError("Failed to parse Gemini response");
      }
    } catch (error) {
      console.error("Error processing screenshots with Gemini:", error);
      throw new LLMServiceError(
        `Gemini processing error: ${(error as Error).message}`
      );
    }
  }
}
