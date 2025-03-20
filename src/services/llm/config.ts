import { LLMServiceFactory } from "./factory";
import { LLMService } from "../types";
import { Config, Screenshot, ProcessedSolution } from "../types";

let llmService: LLMService | null = null;

async function updateConfig(config: Config): Promise<void> {
  try {
    llmService = await LLMServiceFactory.createService({
      provider: config.provider || "openai",
      apiKey: config.apiKey,
      language: config.language || "Python",
      modelName: config.modelName,
      endpoint: config.endpoint,
    });
  } catch (error) {
    console.error("Error initializing LLM service:", error);
    throw error;
  }
}

async function processScreenshots(
  screenshots: Screenshot[]
): Promise<ProcessedSolution> {
  if (!llmService) {
    throw new Error(
      "LLM service not initialized. Please configure your API settings first. Click CTRL/CMD + P to open settings."
    );
  }

  try {
    return await llmService.processScreenshots(screenshots);
  } catch (error) {
    console.error("Error processing screenshots:", error);
    throw error;
  }
}

export default {
  processScreenshots,
  updateConfig,
};
