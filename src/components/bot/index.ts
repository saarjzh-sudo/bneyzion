// Barrel — single import entrypoint for the bot
// Path in repo: src/components/bot/index.ts

export { OnboardingBot } from "./OnboardingBot";
export { useBotSession } from "./useBotSession";
export type {
  BotMessage,
  BotResponse,
  BotCta,
  BotIntent,
  BotPersona,
  BotIcon,
} from "./types";
