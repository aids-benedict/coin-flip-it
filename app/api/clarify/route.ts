import { NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import { requireAuth, isErrorResponse } from "@/lib/api-helpers";
import { buildPastAnswersContext } from "@/lib/decision-helpers";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    const { question, options } = await request.json();

    if (!question || !options || options.length < 2) {
      return NextResponse.json(
        { error: "Question and at least 2 options required" },
        { status: 400 }
      );
    }

    // Fetch relevant past decisions with their clarifying answers
    const pastAnswersContext = await buildPastAnswersContext(userId, question, options);

    // Ask Claude to generate clarifying questions
    const prompt = `You are helping a user make a decision. They need to choose between options, but you should first ask them 2-4 clarifying questions to better understand their situation and provide a more personalized recommendation.

Question: ${question}

Options:
${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join("\n")}${pastAnswersContext}

Generate 2-4 relevant clarifying questions that would help you provide better advice. Questions should be specific to this decision and help understand the user's context, constraints, goals, or preferences.

Format your response as JSON with questions and optional default answers:
{
  "questions": [
    {"question": "Question 1 here?", "defaultAnswer": "Previous answer if applicable, otherwise empty string"},
    {"question": "Question 2 here?", "defaultAnswer": ""}
  ]
}

Keep questions concise and relevant. Don't ask more than 4 questions.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse Claude's response
    let questionsData = null;

    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      questionsData = JSON.parse(codeBlockMatch[1]);
    } else {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        questionsData = JSON.parse(jsonMatch[0]);
      }
    }

    if (!questionsData || !questionsData.questions) {
      console.error("Failed to parse questions:", responseText);
      throw new Error("Failed to generate clarifying questions");
    }

    // Handle both old format (array of strings) and new format (array of objects)
    const formattedQuestions = questionsData.questions.map((q: any) => {
      if (typeof q === "string") {
        return { question: q, defaultAnswer: "" };
      }
      return q;
    });

    return NextResponse.json({
      questions: formattedQuestions,
    });
  } catch (error) {
    console.error("Clarify error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions" },
      { status: 500 }
    );
  }
}
