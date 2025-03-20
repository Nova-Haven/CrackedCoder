import React, { useState, useEffect } from "react";
import "./ConfigScreen.css";

interface ConfigProps {
  onSave: (config: {
    provider: string;
    apiKey: string;
    language: string;
    modelName?: string;
    endpoint?: string;
  }) => void;
  initialConfig?: {
    provider: string;
    apiKey: string;
    language: string;
    modelName?: string;
    endpoint?: string;
  };
}

const ConfigScreen: React.FC<ConfigProps> = ({ onSave, initialConfig }) => {
  const [provider, setProvider] = useState(initialConfig?.provider || "openai");
  const [apiKey, setApiKey] = useState(initialConfig?.apiKey || "");
  const [language, setLanguage] = useState(initialConfig?.language || "Python");
  const [modelName, setModelName] = useState(
    initialConfig?.modelName || "gpt-4o"
  );
  const [endpoint, setEndpoint] = useState(initialConfig?.endpoint || "");
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      provider,
      apiKey: apiKey.trim(),
      language,
      modelName: modelName.trim(),
      endpoint: endpoint.trim(),
    });
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <h2>Configuration</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="provider">AI Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="ollama">Ollama (Local)</option>
              <option value="custom">Custom API</option>
            </select>
          </div>

          {(provider === "openai" ||
            provider === "gemini" ||
            provider === "custom") && (
            <div className="form-group">
              <label htmlFor="apiKey">API Key</label>
              <div className="api-key-input">
                <input
                  type={showApiKey ? "text" : "password"}
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  placeholder={
                    provider === "openai" ? "sk-..." : "Enter API key"
                  }
                  spellCheck="false"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {(provider === "ollama" || provider === "custom") && (
            <div className="form-group">
              <label htmlFor="endpoint">API Endpoint</label>
              <input
                type="text"
                id="endpoint"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                required
                placeholder={
                  provider === "ollama"
                    ? "http://localhost:11434/api"
                    : "Enter API endpoint"
                }
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="modelName">
              {provider === "ollama" ? "Model Name" : "Model"}
            </label>
            <input
              type="text"
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
              placeholder={
                provider === "openai"
                  ? "gpt-4o"
                  : provider === "gemini"
                  ? "gemini-pro-vision"
                  : provider === "ollama"
                  ? "llama3"
                  : "Enter model name"
              }
            />
          </div>

          <div className="form-group">
            <label htmlFor="language">Preferred Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              <option value="Python">Python</option>
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C">C</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="save-button">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigScreen;
