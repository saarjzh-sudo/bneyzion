// Types for the Bnei Zion site navigator bot
// Path in repo: src/components/bot/types.ts

export type BotIcon =
  | "book"
  | "search"
  | "compass"
  | "graduation"
  | "sparkle"
  | "heart"
  | "calendar"
  | "map"
  | "video"
  | "donation";

export type BotIntent =
  | "parasha"
  | "haftarah"
  | "how_to_learn"
  | "search"
  | "rabbi"
  | "creator"
  | "topic"
  | "moed"
  | "digital_tanach"
  | "study_aids"
  | "dedication"
  | "donation"
  | "persona_question"
  | "memorial_question"
  | "content_question_redirected"
  | "off_topic"
  | "other";

export type BotPersona =
  | "shai"
  | "hagit"
  | "roy"
  | "teacher"
  | "rabbi"
  | "haredi"
  | "secular";

export interface BotCta {
  label: string;
  route: string;
  icon?: BotIcon;
}

export interface BotResponse {
  reply_text: string;
  cta_buttons: BotCta[];
  intent_detected: BotIntent;
  persona_guess: BotPersona | null;
  route_suggestion: string;
  refused_content: boolean;
}

export interface BotMessage {
  role: "user" | "model";
  content: string | BotResponse;
  ts: number;
}

export interface BotSession {
  session_id: string;
  history: BotMessage[];
  persona: BotPersona | null;
}

export interface OpeningButton {
  id: string;
  label: string;
  icon: BotIcon;
  // If `prompt` is set, sending that prompt as the user's first message.
  // If `route` is set, navigate immediately without LLM call.
  prompt?: string;
  route?: string;
  followUp?: {
    question: string;
    options: { label: string; persona: BotPersona; nextPrompt: string }[];
  };
}
