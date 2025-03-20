import { LLMConfig, LLMService } from "../types";
import { OpenAIService } from "./openai";
import { GeminiService } from "./gemini";
import { OllamaService } from "./ollama";

export class LLMServiceFactory {
  static async createService(config: LLMConfig): Promise<LLMService> {
    let service: LLMService;

    switch (config.provider.toLowerCase()) {
      case "openai":
        service = new OpenAIService();
        break;
      case "gemini":
        service = new GeminiService();
        break;
      case "ollama":
        service = new OllamaService();
        break;
      case "custom":
        // For custom APIs, we can extend this later
        service = new OpenAIService();
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    await service.initialize(config);
    return service;
  }
}
