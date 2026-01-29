export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  inputPricePer1M: number;  // OpenRouter cost in USD per 1M tokens
  outputPricePer1M: number;
  platformMarkup: number;   // multiplier (e.g., 1.3 = 30% margin)
  free: boolean;
  maxTokens: number;
}

// Dynamic pricing: we always charge more than we pay.
// User-facing cost = OpenRouter cost × platformMarkup
// This ensures we are NEVER in the red.
export const MODELS: ModelConfig[] = [
  {
    id: "meta-llama/llama-4-maverick:free",
    name: "Llama 4 Maverick (Free)",
    provider: "Meta",
    inputPricePer1M: 0,
    outputPricePer1M: 0,
    platformMarkup: 1.0,
    free: true,
    maxTokens: 8192,
  },
];

export function getModel(modelId: string): ModelConfig | undefined {
  return MODELS.find((m) => m.id === modelId);
}

/** Calculate user-facing cost in credits (1 credit = $0.001 = 0.1 cents) */
export function calculateCost(
  model: ModelConfig,
  inputTokens: number,
  outputTokens: number
): number {
  if (model.free) return 0;
  const inputCost = (inputTokens / 1_000_000) * model.inputPricePer1M * model.platformMarkup;
  const outputCost = (outputTokens / 1_000_000) * model.outputPricePer1M * model.platformMarkup;
  const totalUSD = inputCost + outputCost;
  // Convert to credits: 1 credit = $0.001
  return Math.ceil(totalUSD * 1000);
}

export const DEFAULT_MODEL = MODELS[0].id;

// Subscription plans
export const PLANS = {
  free: { name: "Free", priceUSD: 0, monthlyCredits: 0 },
  pro: { name: "Pro", priceUSD: 15, monthlyCredits: 15000 }, // $15/mo = 15,000 credits ($15 worth)
} as const;
