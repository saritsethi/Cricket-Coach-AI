// AI provider: Google Gemini, reached through its OpenAI-compatible endpoint.
// The app was written against the OpenAI SDK; the SDK is kept and pointed at
// https://generativelanguage.googleapis.com/v1beta/openai/ with a Gemini API key.
// Verified model mapping (2026-11-15, cricket-coach AI Studio key, free tier):
//   gpt-4o-mini -> gemini-3.5-flash-lite  (chat, 200 verified)
//   gpt-4o      -> gemini-3.5-flash       (chat with images, 200 verified)
//   gpt-5.1     -> gemini-3.6-flash       (most capable chat, 200 verified)
//   gpt-image-1 -> gemini-2.5-flash-image (recognised, free-tier quota exceeded)
//   gpt-audio and gpt-4o-mini-transcribe have NO working equivalent here:
//     /audio/speech and /audio/transcriptions return 404, and chat
//     completions with audio output return 404 for the native-audio model.
import OpenAI from "openai";
export const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
export function getAiApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "";
}
export function getAiBaseUrl(): string {
  return process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || GEMINI_BASE_URL;
}
export function createAiClient(): OpenAI {
  return new OpenAI({ apiKey: getAiApiKey() || "missing-key", baseURL: getAiBaseUrl() });
}
export const MODEL_MAP: Record<string, string> = {
  "gpt-4o-mini": "gemini-3.5-flash-lite",
  "gpt-4o": "gemini-3.5-flash",
  "gpt-5.1": "gemini-3.6-flash",
  "gpt-image-1": "gemini-2.5-flash-image",
};
export function mapModel(openAiModel: string): string {
  return MODEL_MAP[openAiModel] ?? openAiModel;
}
export const IMAGE_MODEL = "gemini-2.5-flash-image";
export const AUDIO_SUPPORTED = false;
export const AUDIO_UNAVAILABLE_MESSAGE =
  "Voice and transcription are not available with the current Gemini configuration: Google OpenAI-compatible endpoint returns 404 for audio endpoints and for chat completions with audio output. Text chat is unaffected.";
