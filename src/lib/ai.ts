/** Claude API で文章を作る（ANTHROPIC_API_KEY が必要） */
export async function generateText(system: string, user: string, maxTokens = 800) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("AIのキー（ANTHROPIC_API_KEY）が未設定です。Vercelの環境変数に登録してください。");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || "claude-haiku-5-5", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
  });
  const data = (await res.json().catch(() => null)) as { content?: { type: string; text?: string }[]; error?: { message?: string } } | null;
  if (!res.ok) throw new Error(`AIの呼び出しに失敗しました（${res.status}）${data?.error?.message ? `：${data.error.message}` : ""}`);
  return (data?.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("").trim();
}
