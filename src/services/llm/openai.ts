import OpenAI from "openai";
import fs from "fs/promises";
import {
  LLMConfig,
  LLMService,
  ProcessedSolution,
  LLMServiceError,
  Screenshot,
} from "../types";

export class OpenAIService implements LLMService {
  private client: OpenAI | null = null;
  private language: string = "Python";
  private modelName: string = "gpt-4o";

  async initialize(config: LLMConfig): Promise<void> {
    if (!config.apiKey) {
      throw new LLMServiceError("OpenAI API key is required");
    }

    try {
      this.client = new OpenAI({
        apiKey: config.apiKey.trim(),
      });
      this.language = config.language || "Python";
      this.modelName = config.modelName || "gpt-4o";
      console.log("OpenAI client initialized with model:", this.modelName);
    } catch (error) {
      console.error("Error initializing OpenAI client:", error);
      throw new LLMServiceError("Failed to initialize OpenAI client");
    }
  }

  async processScreenshots(
    screenshots: Screenshot[]
  ): Promise<ProcessedSolution> {
    if (!this.client) {
      throw new LLMServiceError("OpenAI client not initialized");
    }

    try {
      const messages = [
        {
          role: "system" as const,
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
          role: "user" as const,
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
        const base64Image = await fs.readFile(screenshot.path, {
          encoding: "base64",
        });
        messages.push({
          role: "user" as const,
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            } as any,
          ],
        });
      }

      // Get response from OpenAI
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        max_tokens: 2000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content || "{}";
      return JSON.parse(content) as ProcessedSolution;
    } catch (error) {
      console.error("Error processing screenshots with OpenAI:", error);
      throw new LLMServiceError(
        `OpenAI processing error: ${(error as Error).message}`
      );
    }
  }
}
