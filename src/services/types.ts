export interface Screenshot {
  id: number;
  preview: string;
  path: string;
}

export interface Config {
  provider: string;
  apiKey?: string;
  language: string;
  modelName?: string;
  endpoint?: string;
}

export interface ProcessedSolution {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface LLMConfig {
  provider: string;
  apiKey?: string;
  language: string;
  modelName?: string;
  endpoint?: string;
}

export interface ProcessedSolution {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
}

export interface LLMService {
  initialize(config: LLMConfig): Promise<void>;
  processScreenshots(screenshots: Screenshot[]): Promise<ProcessedSolution>;
}

export class LLMServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMServiceError";
  }
}