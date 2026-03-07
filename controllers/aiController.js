// AI Problem Analysis Controller
// Uses OpenAI to analyze user's problem description and recommend a professional

const analyzeProblem = async (req, res, next) => {
  try {
    const { transcript } = req.body;

    if (!transcript) {
      res.status(400);
      throw new Error("Please provide a transcript");
    }

    // Use OpenAI if available, otherwise use keyword-based matching
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a service matching assistant. Analyze the user's problem and respond with a JSON object containing:
- "summary": a concise 1-2 sentence summary of their problem
- "category": the service category (e.g. "Electrician", "Plumber", "Carpenter", "Appliance Repair", "Painter", "Cleaning", "General Labor", "Mechanic", "Handyman")
- "professionals": array of recommended professional types to contact
- "urgency": "low", "medium", or "high"

Respond ONLY with valid JSON, no markdown.`,
            },
            { role: "user", content: transcript },
          ],
          temperature: 0.3,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      try {
        const parsed = JSON.parse(content);
        return res.status(200).json({ success: true, data: parsed });
      } catch {
        return res.status(200).json({
          success: true,
          data: {
            summary: content,
            category: "General Labor",
            professionals: ["General Handyman"],
            urgency: "medium",
          },
        });
      }
    }

    // Fallback: keyword-based matching
    const lower = transcript.toLowerCase();
    let category = "General Labor";
    let professionals = ["General Handyman"];

    if (lower.match(/electric|wiring|outlet|socket|light|bulb|circuit|breaker/)) {
      category = "Electrician";
      professionals = ["Licensed Electrician"];
    } else if (lower.match(/plumb|pipe|leak|faucet|drain|toilet|water/)) {
      category = "Plumber";
      professionals = ["Licensed Plumber"];
    } else if (lower.match(/carpent|wood|cabinet|door|shelf|furniture/)) {
      category = "Carpenter";
      professionals = ["Carpenter"];
    } else if (lower.match(/paint|wall|ceiling|color/)) {
      category = "Painter";
      professionals = ["Painter"];
    } else if (lower.match(/clean|mop|sweep|wash|sanit/)) {
      category = "Cleaning";
      professionals = ["Cleaning Service"];
    } else if (lower.match(/appliance|aircon|ac|refrigerator|washing machine|repair/)) {
      category = "Appliance Repair";
      professionals = ["Appliance Technician"];
    } else if (lower.match(/car|engine|tire|brake|mechanic|vehicle/)) {
      category = "Mechanic";
      professionals = ["Auto Mechanic"];
    } else if (lower.match(/roof|gutter|fix|broken|handyman/)) {
      category = "Handyman";
      professionals = ["Handyman"];
    }

    res.status(200).json({
      success: true,
      data: {
        summary: `You need help with: ${transcript.substring(0, 100)}`,
        category,
        professionals,
        urgency: "medium",
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { analyzeProblem };
