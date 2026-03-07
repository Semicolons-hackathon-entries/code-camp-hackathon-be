const Worker = require("../models/Worker");
const Service = require("../models/Service");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SERVICE_CATEGORIES = [
  "Electrician",
  "Plumber",
  "Painter",
  "Handyman",
  "Cleaning",
  "Rental",
  "Home Repair",
  "Moving",
  "Construction",
  "Laundry",
  "Catering",
  "Tutoring",
];

const SYSTEM_PROMPT = `You are Denki, a friendly, warm, and human-sounding voice assistant for Kita — a service marketplace connecting clients with skilled professionals.

You are speaking out loud to the user via text-to-speech, so your responses must sound natural when read aloud. Write like you talk — casual, warm, like a helpful friend.

AVAILABLE SERVICE CATEGORIES:
${SERVICE_CATEGORIES.map((c) => `- ${c}`).join("\n")}

CONVERSATION FLOW:
1. GATHER: Chat naturally to understand what's wrong. Ask one specific question at a time — what broke, where, how bad, etc. Be empathetic.
2. SUMMARIZE: Once you know enough, summarize the problem clearly and recommend a professional type. Ask the user to confirm.
3. READY: After the user confirms (says yes, book it, go ahead, etc.), tell them you're on it.

RESPONSE FORMAT:
Respond ONLY with valid JSON. No markdown, no backticks. Exact structure:

{
  "speechLines": ["First sentence to speak.", "Second sentence to speak."],
  "phase": "gathering" | "summarizing" | "ready",
  "summary": null or "Plain-language summary of the problem",
  "category": null or "Best matching category from the list",
  "urgency": null or "low" | "medium" | "high"
}

RULES FOR speechLines:
- This is what Denki will SAY OUT LOUD via TTS. Write for the ear, not the eye.
- KEEP IT SHORT. Maximum 1-2 speechLines per response. One is ideal. Combine thoughts into a single natural sentence.
- Sound like a real human. Use contractions (you're, it's, we'll, that's).
- Show genuine empathy but briefly: "Oh no, a leaking pipe? Let me help with that." — one line, not three.
- During SUMMARIZE phase, combine summary + recommendation into one line like: "Sounds like you need a plumber for that leaky pipe, want me to find one?"
- During READY phase, just say: "On it, finding someone now!"
- NEVER use emoji, markdown, or special characters. Plain spoken English only.
- Don't say "As an AI" or "I'm an assistant" — you're Denki, a person helping out.
- DO NOT repeat what the user said back to them. Just respond naturally and move forward.

OTHER RULES:
- If the first message already clearly describes the problem, skip straight to summarizing.
- For urgency: water/electrical/safety = high, broken but functional = medium, cosmetic/non-urgent = low.
- ONLY pick categories from the list above.`;

async function chat(conversationHistory) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...conversationHistory.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
  ];

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.6,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("Empty response from Groq");
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed.speechLines && parsed.message) {
      parsed.speechLines = [parsed.message];
    }
    return parsed;
  } catch {
    return {
      speechLines: [text],
      phase: "gathering",
      summary: null,
      category: null,
      urgency: null,
    };
  }
}

async function findMatchingWorkers(category, excludeIds = []) {
  const categoryLower = category.toLowerCase();

  const query = { isAvailable: true };
  if (excludeIds.length > 0) {
    query._id = { $nin: excludeIds };
  }

  const workers = await Worker.find(query)
    .populate("userId", "email");

  // Filter by skill match
  const matched = workers.filter((w) =>
    w.skills.some((skill) => {
      const skillLower = skill.toLowerCase();
      return (
        skillLower.includes(categoryLower) ||
        categoryLower.includes(skillLower)
      );
    })
  );

  // Sort skill-matched workers by rating (best first)
  matched.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const results = matched.length > 0 ? matched : workers;

  // Enrich with services
  const workerIds = results.map((w) => w._id);
  const services = await Service.find({ workerId: { $in: workerIds } });

  return results.slice(0, 5).map((worker) => {
    const workerServices = services.filter(
      (s) => s.workerId.toString() === worker._id.toString()
    );
    return {
      _id: worker._id,
      name: worker.name,
      skills: worker.skills,
      rating: worker.rating,
      serviceDescription: worker.serviceDescription,
      isAvailable: worker.isAvailable,
      services: workerServices.map((s) => ({
        title: s.title,
        description: s.description,
        price: s.price,
        category: s.category,
      })),
    };
  });
}

module.exports = { chat, findMatchingWorkers, SERVICE_CATEGORIES };
