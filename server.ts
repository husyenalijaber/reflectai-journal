import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Default model: Gemini 3.6 Flash ('gemini-3.6-flash') with high-reliability fallbacks
const CHAT_MODELS = ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-flash-latest"];

async function callGeminiForChat(
  ai: GoogleGenAI,
  generateParams: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;

  for (const model of CHAT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: generateParams.contents,
        config: generateParams.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini API] Error calling ${model}:`, err?.message || err);
      // Immediately try fallback model without long sleep
      continue;
    }
  }

  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "5mb" }));

  // API Health Check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    });
  });

  // Multi-turn Gemini Chat for Journal Reflections (Default: Gemini 3.6 Flash)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const {
        messages,
        reflectionMode = "reflective",
        language = "id", // Default to Indonesian or chosen APAC language
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "A valid messages array is required." });
      }

      const ai = getAIClient();

      let modeInstruction = "";
      if (reflectionMode === "brainstorm") {
        modeInstruction =
          "Fokus eksplorasi ide mendalam & penalaran analitis: berikan solusi kreatif, perspektif alternatif, dan opsi tindakan konkret, segar, serta muhasabah mendalam.";
      } else if (reflectionMode === "summary") {
        modeInstruction =
          "Fokus merangkum benang merah emosi dan poin inti perbincangan secara ringkas dan padat.";
      } else {
        modeInstruction =
          "Fokus active listening, empati hangat & wawasan reflektif seimbang: dengarkan dengan tulus, validasi perasaan tanpa menghakimi, bantu reframing positif, dan bimbing dengan kejelasan.";
      }

      // APAC Language Directives
      const languageDirectives: Record<string, string> = {
        id: "Wajib balas sepenuhnya dalam Bahasa Indonesia yang alami, santai, empatik, dan hangat seperti sahabat dekat.",
        en: "You must respond entirely in natural, empathetic, and conversational English.",
        ms: "Wajib balas sepenuhnya dalam Bahasa Melayu yang mesra, bersahabat, empati, dan santai.",
        ja: "完全に親しみやすく共感的な日本語（丁寧で温かい口調）で返答してください。",
        ko: "따뜻하고 공감 넘치며 자연스러운 한국어로 완전히 답변해 주세요.",
        zh: "请完全使用温暖、富有同理心且自然的中文进行回复。",
        vi: "Hãy trả lời hoàn toàn bằng tiếng Việt ấm áp, đồng cảm và tự nhiên.",
        th: "กรุณาตอบเป็นภาษาไทยด้วยน้ำเสียงที่อบอุ่น เห็นอกเห็นใจ และเป็นกันเองอย่างสมบูรณ์",
        fil: "Sumagot nang buo sa mainit, maunawain, at natural na wikang Filipino/Tagalog.",
        hi: "पूरी तरह से आत्मीय, सहानुभूतिपूर्ण और स्वाभाविक हिंदी में उत्तर दें।",
      };

      const langInstruction =
        languageDirectives[language] || languageDirectives.id;

      const systemInstruction = `You are ReflectAI, an empathetic, warm, insightful self-reflection partner and brainstorming collaborator.
Core goals:
1. Fast & Responsive: If the user sends a brief greeting (e.g., 'hi', 'halo', 'hello', 'konnichiwa', 'annyeong'), reply warmly, concisely, and invitingly in 1-2 sentences without lecturing.
2. Safe Haven & Brainstorming: Validate feelings, provide gentle reframing when stressed, and offer constructive insights.
3. Chat Style: Natural, friendly, thoughtful, and pacing like an authentic instant messaging conversation.
4. CRITICAL FORMAT RULES:
- STRICTLY FORBIDDEN from using em-dash (—) anywhere. Use standard comma (,), regular hyphen (-), or period (.) instead.
- End with 1 thoughtful question or reflective prompt to guide the next step.
- CRITICAL LANGUAGE MANDATE: ${langInstruction}
You MUST reply 100% in the selected language matching the directive above. Do NOT use Indonesian or English if another language is requested.
- MODE: ${modeInstruction}`;

      // Transform history for generateContent with replyTo context support
      const contents = messages.map(
        (m: {
          role: string;
          content: string;
          replyTo?: { senderName: string; snippet: string };
        }) => {
          let text = m.content;
          if (m.replyTo) {
            text = `[Quoting ${m.replyTo.senderName}: "${m.replyTo.snippet}"]\n\n${text}`;
          }
          return {
            role: m.role === "assistant" || m.role === "model" ? "model" : "user",
            parts: [{ text }],
          };
        }
      );

      const response = await callGeminiForChat(ai, {
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      });

      let replyText = response.text || "Aku siap mendengarkan ceritamu.";
      replyText = replyText.replace(/—/g, " - ");
      return res.json({ reply: replyText, model: "gemini-3.6-flash" });
    } catch (error: any) {
      console.warn("[Gemini Chat] Service temporarily unavailable:", error?.message || error);
      return res.status(503).json({
        error: "Gemini is currently experiencing high demand. Please try again in a few moments.",
      });
    }
  });

  // Generate Session Summary and Key Takeaways
  app.post("/api/gemini/summarize", async (req, res) => {
    try {
      const { title, messages, language = "id" } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Conversation messages are required." });
      }

      const ai = getAIClient();

      const languageDirectives: Record<string, string> = {
        id: "Tuliskan seluruh rangkuman dalam Bahasa Indonesia yang hangat, reflektif, dan jelas.",
        en: "Write the entire summary in fluent, empathetic English.",
        ms: "Tuliskan seluruh ringkasan dalam Bahasa Melayu yang mesra dan jelas.",
        ja: "要約全体を自然で丁寧な日本語で記述してください。",
        ko: "전체 요약을 자연스럽고 따뜻한 한국어로 작성해 주세요.",
        zh: "请完全使用流畅、温暖的中文撰写总结。",
        vi: "Hãy viết toàn bộ bản tóm tắt bằng tiếng Việt tự nhiên và sâu sắc.",
        th: "เขียนบทสรุปทั้งหมดเป็นภาษาไทยด้วยน้ำเสียงที่อบอุ่นและชัดเจน",
        fil: "Isulat ang buong buod sa wikang Filipino/Tagalog.",
        hi: "पूरा सारांश स्वाभाविक और आत्मीय हिंदी में लिखें।",
      };

      const langDirective = languageDirectives[language] || languageDirectives.id;

      const conversationTranscript = messages
        .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "ReflectAI"}: ${m.content}`)
        .join("\n\n");

      const prompt = `Analyze this reflective journal dialogue titled "${title || "Untitled Entry"}":

${conversationTranscript}

Provide a comprehensive, beautifully structured journal reflection synthesis in clean Markdown.
Language requirement: ${langDirective}
Do NOT use em-dash (—). Use normal hyphens (-) or commas.

1. **Core Theme & Mood**: A 1-2 sentence distillation of what the user is experiencing.
2. **Key Insights & Revelations**: 2-3 bullet points highlighting self-discoveries or pivotal concepts discussed.
3. **Actionable Mindset / Takeaway**: 1-2 gentle, concrete suggestions or affirmations moving forward.`;

      const response = await callGeminiForChat(ai, {
        contents: prompt,
        config: {
          temperature: 0.5,
        },
      });

      let summaryText = response.text || "";
      summaryText = summaryText.replace(/—/g, " - ");
      return res.json({ summary: summaryText });
    } catch (error: any) {
      console.warn("[Gemini Summarize] Service temporarily unavailable:", error?.message || error);
      return res.status(503).json({
        error: "Gemini is currently experiencing high demand. Please try summarizing again shortly.",
      });
    }
  });

  // Curated fallback prompts collection for high-availability
  const CURATED_PROMPTS = [
    {
      prompt: "What is one quiet truth about how you are feeling right now that you haven't given yourself permission to acknowledge today?",
      theme: "Emotional Honesty & Grounding",
      category: "Mindfulness",
      guidance: "Take a deep breath and write without censoring or judging yourself.",
    },
    {
      prompt: "What is an unexpected lesson you learned from a recent mistake or misstep, and how has it reshaped your perspective?",
      theme: "Growth & Resilience",
      category: "Personal Growth",
      guidance: "Reflect with gentle curiosity rather than self-criticism.",
    },
    {
      prompt: "Where in your life are you holding onto expectations that are causing unnecessary friction or fatigue?",
      theme: "Letting Go & Acceptance",
      category: "Clarity",
      guidance: "Identify what is within your control and what belongs to others.",
    },
    {
      prompt: "If you looked at your current situation through the eyes of a deeply compassionate friend, what would they tell you?",
      theme: "Self-Compassion",
      category: "Emotional Well-being",
      guidance: "Speak to yourself with the same warmth you would offer someone you love.",
    },
    {
      prompt: "What drained your energy most today, and what is one small thing that restored your peace?",
      theme: "Energy & Boundaries",
      category: "Intentional Living",
      guidance: "Observe your daily rhythms and notice what energizes or depletes you.",
    },
    {
      prompt: "What would your day look like tomorrow if you allowed yourself to be 10% more present and 10% less hurried?",
      theme: "Presence & Slowness",
      category: "Mindfulness",
      guidance: "Focus on the sensory details and transitions between moments.",
    },
    {
      prompt: "What is something you used to worry about intensely that no longer holds any power over you today?",
      theme: "Perspective & Time",
      category: "Gratitude",
      guidance: "Notice how quiet resilience has grown within you over the years.",
    },
    {
      prompt: "What is one commitment you made to yourself that you'd like to reaffirm with kindness today?",
      theme: "Self-Alignment & Integrity",
      category: "Focus",
      guidance: "Reflect on why this commitment mattered to you in the first place.",
    },
  ];

  // Prompt of the Day Endpoint (fetches daily suggestions with fallback resilience)
  app.post("/api/gemini/prompt-of-the-day", async (req, res) => {
    const { category, currentTheme } = req.body || {};

    try {
      const ai = getAIClient();

      const promptRequest = `Generate an inspiring, original, and deeply thoughtful "Prompt of the Day" for a reflective personal journal session.
Target focus: ${category ? `Category "${category}"` : "Diverse mindfulness, self-awareness, emotional grounding, or intentional growth"}.
${currentTheme ? `Ensure it is fresh and distinct from: "${currentTheme}".` : ""}
Provide a provocative question that sparks honest reflection, personal discovery, or calm clarity.`;

      const response = await callGeminiForChat(ai, {
        contents: promptRequest,
        config: {
          temperature: 0.85,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              prompt: { type: "string" },
              theme: { type: "string" },
              category: { type: "string" },
              guidance: { type: "string" },
            },
            required: ["prompt", "theme", "category", "guidance"],
          },
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);
      if (parsed.prompt && parsed.theme) {
        return res.json(parsed);
      }
      throw new Error("Invalid schema received from Gemini.");
    } catch (error: any) {
      console.warn("[Gemini Prompt of the Day] Fallback triggered due to model demand spike:", error?.message || error);
      // Seamlessly select a fresh prompt from curated collection
      const filtered = CURATED_PROMPTS.filter((p) => p.theme !== currentTheme);
      const chosen = (filtered.length > 0 ? filtered : CURATED_PROMPTS)[
        Math.floor(Math.random() * (filtered.length > 0 ? filtered.length : CURATED_PROMPTS.length))
      ];
      return res.json(chosen);
    }
  });

  // Vite middleware in dev; static file serving in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
