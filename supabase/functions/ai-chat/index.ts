/*
  DataStory AI — ai-chat edge function

  Receives a user question plus a compact, computed summary of the
  currently-loaded dataset (column profiles, key statistics, findings,
  correlations, anomalies — NOT raw CSV rows). Calls Google Gemini to
  produce a grounded natural-language answer.

  The Gemini API key is read from the edge function secret AI_API_KEY
  (set via Bolt Secrets). It is never exposed to the browser.
*/

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.0-flash-001";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Guardrails baked into the system instruction so Gemini stays grounded.
const SYSTEM_INSTRUCTION = `You are the DataStory AI data analyst assistant.
You answer questions about a dataset the user has uploaded. You are given a computed summary of that dataset — column profiles, descriptive statistics, correlations, anomalies, and findings. All numbers in the summary are already calculated by the application; treat them as ground truth.

Rules:
1. Answer ONLY using the facts provided in the dataset summary. Never invent, estimate, or fabricate numbers, column names, row counts, or findings.
2. If the question asks for a number that is present in the summary, quote it exactly.
3. If the question asks about something the summary does not contain, say honestly that the information is not available from the current dataset. Do not guess.
4. Keep answers concise (2–5 sentences unless the user asks for detail). Use plain language a non-technical person can understand.
5. Do not mention that you are an AI or that you received a summary — just answer as the data analyst.
6. If the user asks a question unrelated to the dataset, politely steer them back to asking about their data.
7. Do not produce code, SQL, or markdown tables unless explicitly asked.`;

interface IncomingBody {
  question: string;
  summary: string;
  history?: { role: 'user' | 'agent'; text: string }[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const apiKey = Deno.env.get("AI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "The AI service is not configured. The AI_API_KEY secret has not been set.",
          fallback: true,
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: IncomingBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const question = typeof body.question === "string" ? body.question.trim() : "";
    const summary = typeof body.summary === "string" ? body.summary.trim() : "";

    if (!question) {
      return new Response(
        JSON.stringify({ error: "Missing 'question' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (question.length > 1000) {
      return new Response(
        JSON.stringify({ error: "Question is too long (max 1000 characters)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!summary) {
      return new Response(
        JSON.stringify({ error: "Missing 'summary' field." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    // Cap the summary size so we never send an oversized payload.
    const MAX_SUMMARY = 12000;
    const trimmedSummary = summary.length > MAX_SUMMARY
      ? summary.slice(0, MAX_SUMMARY) + "\n[summary truncated]"
      : summary;

    // Build the contents array: optional prior turns, then the current question.
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Include a small amount of recent history for conversational context.
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    for (const turn of history) {
      if (typeof turn.text !== "string" || !turn.text.trim()) continue;
      contents.push({
        role: turn.role === "user" ? "user" : "model",
        parts: [{ text: turn.text.slice(0, 800) }],
      });
    }

    // The current question, prefixed with the computed summary as context.
    contents.push({
      role: "user",
      parts: [{
        text: `Here is the computed summary of the user's dataset:\n\n${trimmedSummary}\n\n---\n\nUser question: ${question}`,
      }],
    });

    const geminiBody = {
      system_instruction: {
        parts: [{ text: SYSTEM_INSTRUCTION }],
      },
      contents,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 600,
        topP: 0.9,
      },
    };

    let geminiResp: Response;
    try {
      geminiResp = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geminiBody),
      });
    } catch {
      return new Response(
        JSON.stringify({
          error: "Could not reach the AI service. Please check your connection and try again.",
          fallback: true,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!geminiResp.ok) {
      // Rate limit (429) and other errors — return a graceful fallback signal.
      let detail = "";
      try {
        const errJson = await geminiResp.json();
        detail = errJson?.error?.message ?? "";
      } catch { /* ignore */ }
      const isRateLimit = geminiResp.status === 429;
      return new Response(
        JSON.stringify({
          error: isRateLimit
            ? "The AI service is rate-limited right now. Please wait a moment and try again."
            : `The AI service returned an error${detail ? `: ${detail}` : "."}`,
          fallback: true,
        }),
        { status: isRateLimit ? 429 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let geminiData: {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    try {
      geminiData = await geminiResp.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "The AI service returned an invalid response. Please try again.",
          fallback: true,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !text.trim()) {
      return new Response(
        JSON.stringify({
          error: "The AI service did not produce an answer. Please rephrase your question and try again.",
          fallback: true,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ answer: text.trim() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return new Response(
      JSON.stringify({ error: message, fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
