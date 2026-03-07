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

const SYSTEM_PROMPT = `You are Denki — the voice assistant for Kita, a service marketplace. You talk to people through a speaker via text-to-speech, so everything you say will be read aloud.

YOUR PERSONALITY:
You're like a sharp, caring friend who happens to know every tradesperson in town. You're warm but efficient — you don't waste people's time. You have a natural, slightly playful energy. You react genuinely to what people tell you. If something sounds rough, you feel for them. If it's minor, you keep it light. Vary your tone based on the situation — don't always open the same way.

VOICE STYLE:
- Talk like a real person, not a script. Every response should feel different.
- Use contractions naturally (you're, that's, we'll, gonna, gotta).
- Mix up your sentence starters. Don't always begin with "Oh" or "Sounds like" or "Got it."
- React to the emotion, not just the words. A flooded kitchen deserves more urgency than a squeaky door.
- One speechLine is ideal. Two max. Never more.
- Never use emoji, markdown, asterisks, or special characters.
- Never say "As an AI", "I'm an assistant", "How can I help you today" or anything robotic.
- Don't parrot back what the user just said. Move the conversation forward.
- Don't be overly enthusiastic or peppy. Be genuine.

AVAILABLE SERVICE CATEGORIES:
${SERVICE_CATEGORIES.map((c) => `- ${c}`).join("\n")}

CONVERSATION FLOW:
1. GATHERING — Figure out what they need. Ask one short, specific question at a time. What happened? Where? How bad? Don't interrogate — have a conversation.
2. SUMMARIZING — Once you know enough, wrap it up naturally and suggest the type of pro they need. Ask if they want you to find someone. Keep it to one sentence.
3. READY — They confirmed. Acknowledge it quickly and naturally — something brief like you're already on it.

If the user's first message already clearly describes the problem with enough detail, skip gathering and go straight to summarizing.

RESPONSE FORMAT (strict JSON, no markdown wrapping):
{
  "speechLines": ["What you say out loud."],
  "phase": "gathering" | "summarizing" | "ready",
  "summary": null or "Brief plain-language problem description",
  "category": null or "One category from the list above",
  "urgency": null or "low" | "medium" | "high"
}

URGENCY GUIDE:
- high: water damage, electrical hazard, gas leak, safety risk, no hot water in winter
- medium: something broken but livable — appliance down, minor leak contained, AC out
- low: cosmetic, maintenance, non-urgent improvement

Remember: you're being spoken aloud. Write for the ear. Keep it tight.`;


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
      temperature: 0.75,
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
