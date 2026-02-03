import { prisma } from "@/lib/prisma";
import { extractKeywords } from "@/lib/text-utils";

/**
 * Format a date as a readable timestamp (e.g., "Feb 3, 2026 2:30 PM")
 */
function formatTimestamp(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format

  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Detect emotional bias in decision-making
 */
export function detectBias(
  clarifyingAnswers: Array<{ question: string; answer: string }> | null,
  initialChoice: string | null,
  optionAnalyses: Array<{ option: string; weight: number }>
): {
  biasDetected: boolean;
  biasType: "emotional" | "contradiction" | "both" | "none";
  biasMessage: string;
  emotionalScore: number;
} {
  let emotionalScore = 0;
  let hasContradiction = false;
  const emotionalKeywords = [
    "feel", "feeling", "felt", "scared", "afraid", "fear", "worried", "anxiety",
    "excited", "love", "hate", "angry", "mad", "frustrated", "stressed",
    "happy", "sad", "upset", "nervous", "anxious", "terrified", "thrilled",
    "desperate", "hopeless", "overwhelmed", "panic", "dread", "heart",
    "gut", "instinct"
  ];

  // Analyze clarifying answers for emotional language
  if (clarifyingAnswers && clarifyingAnswers.length > 0) {
    const allAnswersText = clarifyingAnswers
      .map(qa => qa.answer)
      .join(" ")
      .toLowerCase();

    emotionalKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\w*\\b`, "g");
      const matches = allAnswersText.match(regex);
      if (matches) {
        emotionalScore += matches.length;
      }
    });
  }

  // Check if initial choice contradicts AI's top recommendation
  if (initialChoice && optionAnalyses.length > 0) {
    const topRecommendation = optionAnalyses.reduce((prev, current) =>
      current.weight > prev.weight ? current : prev
    );

    // Normalize for comparison (case insensitive, trim whitespace)
    const normalizedInitial = initialChoice.toLowerCase().trim();
    const normalizedTop = topRecommendation.option.toLowerCase().trim();

    // Check if initial choice is NOT the top recommendation
    if (normalizedInitial !== normalizedTop) {
      // Check if the weight difference is significant (>15 points)
      const initialOption = optionAnalyses.find(
        opt => opt.option.toLowerCase().trim() === normalizedInitial
      );

      if (initialOption && topRecommendation.weight - initialOption.weight > 15) {
        hasContradiction = true;
      }
    }
  }

  // Determine bias type and message
  const isEmotional = emotionalScore >= 3;
  const biasDetected = isEmotional || hasContradiction;

  let biasType: "emotional" | "contradiction" | "both" | "none" = "none";
  let biasMessage = "";

  if (isEmotional && hasContradiction) {
    biasType = "both";
    biasMessage = "⚠️ Your answers show strong emotional language, and your gut feeling contradicts the logical analysis. Consider whether emotions are influencing your decision.";
  } else if (isEmotional) {
    biasType = "emotional";
    biasMessage = "⚠️ Your answers contain emotional language. Make sure you're considering the practical aspects alongside your feelings.";
  } else if (hasContradiction) {
    biasType = "contradiction";
    biasMessage = "⚠️ Your initial choice differs significantly from the analytical recommendation. Your gut might be telling you something important, or it might be influenced by bias.";
  }

  return {
    biasDetected,
    biasType,
    biasMessage,
    emotionalScore,
  };
}

/**
 * Build context from past clarifying answers for similar decisions
 */
export async function buildPastAnswersContext(
  userId: string,
  question: string,
  options: string[]
): Promise<string> {
  const keywords = extractKeywords(question + " " + options.join(" "));

  if (keywords.length === 0) {
    return "";
  }

  // PostgreSQL uses $1, $2, $3 for parameters and ILIKE for case-insensitive matching
  let paramIndex = 2; // Start at 2 because $1 is userId
  const whereConditions = keywords
    .map(() => {
      const condition = `question ILIKE $${paramIndex} OR options ILIKE $${paramIndex + 1}`;
      paramIndex += 2;
      return condition;
    })
    .join(" OR ");
  const searchParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`]);

  const relevantDecisions = await prisma.$queryRawUnsafe<
    Array<{ clarifyingAnswers: string | null; createdAt: Date; question: string }>
  >(
    `SELECT "clarifyingAnswers", "createdAt", question
     FROM "Decision"
     WHERE "userId" = $1::uuid AND "clarifyingAnswers" IS NOT NULL AND (${whereConditions})
     ORDER BY "createdAt" DESC
     LIMIT 3`,
    userId,
    ...searchParams
  );

  if (relevantDecisions.length === 0) {
    return "";
  }

  // Build context with timestamps for each decision
  const decisionsWithContext = relevantDecisions
    .map(d => {
      try {
        const answers = JSON.parse(d.clarifyingAnswers!);
        const relativeTime = formatTimestamp(new Date(d.createdAt));
        return {
          question: d.question,
          answers,
          timestamp: relativeTime,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (decisionsWithContext.length === 0) {
    return "";
  }

  // Format with timestamps
  const contextParts = decisionsWithContext.map(d => {
    const answersText = d!.answers
      .map((qa: any) => `  ${qa.question}: ${qa.answer}`)
      .join("\n");
    return `[${d!.timestamp}] "${d!.question}":\n${answersText}`;
  });

  return `\n\nUser's Previous Answers to Similar Questions:\n${contextParts.join("\n\n")}\n\nWhen generating questions, reference these previous answers where relevant (e.g., "Last time on [date] you mentioned X. Is that still the case?"). Check the timestamps to assess if the information is still current. Include the previous answer as a default value in your response.`;
}

/**
 * Build context from past decisions for similar questions
 */
export async function buildPastDecisionsContext(
  userId: string,
  question: string,
  options: string[]
): Promise<string> {
  const keywords = extractKeywords(question + " " + options.join(" "));

  if (keywords.length === 0) {
    return "";
  }

  // Build WHERE clause for keyword matching (PostgreSQL syntax)
  let paramIndex = 2; // Start at 2 because $1 is userId
  const whereConditions = keywords
    .map(() => {
      const condition = `question ILIKE $${paramIndex} OR options ILIKE $${paramIndex + 1}`;
      paramIndex += 2;
      return condition;
    })
    .join(" OR ");
  const searchParams = keywords.flatMap(kw => [`%${kw}%`, `%${kw}%`]);

  // Query for relevant past decisions (limit 10)
  // Only include decisions where user made a final choice
  const relevantDecisions = await prisma.$queryRawUnsafe<
    Array<{ question: string; finalChoice: string | null; createdAt: Date }>
  >(
    `SELECT question, "finalChoice", "createdAt"
     FROM "Decision"
     WHERE "userId" = $1::uuid AND "finalChoice" IS NOT NULL AND (${whereConditions})
     ORDER BY "createdAt" DESC
     LIMIT 10`,
    userId,
    ...searchParams
  );

  if (relevantDecisions.length === 0) {
    return "";
  }

  // Format with timestamps for temporal context
  const compact = relevantDecisions
    .map(d => {
      const timestamp = formatTimestamp(new Date(d.createdAt));
      return `[${timestamp}] ${d.question} → ${d.finalChoice}`;
    })
    .join("\n");

  return `\n\nUser's Past Similar Decisions:\n${compact}\n\nConsider the dates of these decisions when generating questions.`;
}
