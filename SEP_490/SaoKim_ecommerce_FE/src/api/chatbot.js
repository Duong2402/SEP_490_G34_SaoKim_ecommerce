import { apiFetch } from "./lib/apiClient";

export async function sendChatMessage(payload) {
  const res = await apiFetch("/api/Chatbot/message", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}
