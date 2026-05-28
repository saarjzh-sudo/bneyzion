// Fetch wrapper for the Bnei Zion navigator bot edge function
// Path in repo: src/components/bot/botApi.ts

import { supabase } from "@/integrations/supabase/client";
import type { BotMessage, BotResponse, BotPersona } from "./types";
import { BOT_CONFIG } from "./botConfig";

interface SendOptions {
  message: string;
  sessionId: string;
  history: BotMessage[];
  persona?: BotPersona | null;
  currentRoute?: string | null;
  currentParasha?: string | null;
}

export async function sendBotMessage(opts: SendOptions): Promise<BotResponse> {
  const {
    message,
    sessionId,
    history,
    persona = null,
    currentRoute = null,
    currentParasha = null,
  } = opts;

  // Get the runtime-resolved Supabase URL (NetSpark-safe — see client.ts)
  // @ts-expect-error — internal property, but stable
  const supabaseUrl = supabase.supabaseUrl as string;
  // @ts-expect-error — same as above
  const supabaseAnonKey = supabase.supabaseKey as string;

  // Pull the auth session if user is logged in (for user_id binding)
  const { data: { session: authSession } } = await supabase.auth.getSession();
  const userId = authSession?.user?.id ?? null;

  const endpoint = `${supabaseUrl}${BOT_CONFIG.edgeFunctionPath}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${authSession?.access_token ?? supabaseAnonKey}`,
    },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      user_id: userId,
      persona,
      history: history.slice(-10),
      current_route: currentRoute,
      current_parasha: currentParasha,
    }),
  });

  if (!res.ok && res.status >= 500) {
    // Server error fallback
    return {
      reply_text: "משהו השתבש בשרת. אפשר לנסות שוב בעוד רגע?",
      cta_buttons: [{ label: "דף הבית", route: "/", icon: "compass" }],
      intent_detected: "other",
      persona_guess: null,
      route_suggestion: "/",
      refused_content: false,
    };
  }

  const data = await res.json();
  return data as BotResponse;
}
