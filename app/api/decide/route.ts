import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { requireAuth, isErrorResponse } from "@/lib/api-helpers";
import { buildPastDecisionsContext, detectBias } from "@/lib/decision-helpers";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    const { question, options, clarifyingAnswers, initialChoice } = await request.json();

    if (!question || !options || options.length < 2) {
      return NextResponse.json(
        { error: "Question and at least 2 options required" },
        { status: 400 }
      );
    }

    // Build context from clarifying answers if provided
    let contextSection = "";
    if (clarifyingAnswers && clarifyingAnswers.length > 0) {
      contextSection = `\n\nUser's Context:\n${clarifyingAnswers
        .map((qa: { question: string; answer: string }) => `Q: ${qa.question}\nA: ${qa.answer}`)
        .join("\n\n")}`;
    }

    // Fetch relevant past decisions for personalization
    const pastDecisionsContext = await buildPastDecisionsContext(userId, question, options);

    // Create prompt for Claude
    const prompt = `You are a decision analysis assistant. A user is trying to decide between options and needs your help.

Question: ${question}

Options:
${options.map((opt: string, i: number) => `${i + 1}. ${opt}`).join("\n")}${contextSection}${pastDecisionsContext}

Please analyze this decision and provide:
1. A brief analysis of each option (2-3 sentences per option)
2. Weighted probabilities for each option based on logic (must total 100%)
3. Key factors to consider
4. A final recommendation
5. Risk scenarios for each option (best-case and worst-case outcomes)

${pastDecisionsContext ? "NOTE: Use the user's past similar decisions to identify patterns in their preferences and personalize your recommendation accordingly. Consider what they've chosen before in related situations." : ""}

Format your response as JSON with this structure:
{
  "analysis": "Overall analysis of the situation",
  "optionAnalyses": [
    {
      "option": "option 1",
      "analysis": "analysis of option 1",
      "weight": 40,
      "bestCase": "Best possible outcome if this goes really well",
      "worstCase": "Worst possible outcome if this goes poorly"
    },
    {
      "option": "option 2",
      "analysis": "analysis of option 2",
      "weight": 60,
      "bestCase": "Best possible outcome",
      "worstCase": "Worst possible outcome"
    }
  ],
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "recommendation": "Final recommendation with reasoning"
}

Make the weights realistic based on the pros and cons. Higher weight = stronger recommendation.
For risk scenarios, be realistic but consider both optimistic and pessimistic outcomes.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    console.log("Claude response:", responseText);

    // Parse Claude's response - handle both plain JSON and markdown code blocks
    let analysisData = null;

    // Try to extract JSON from markdown code blocks first
    const codeBlockMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      analysisData = JSON.parse(codeBlockMatch[1]);
    } else {
      // Try to find raw JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      }
    }

    if (!analysisData) {
      console.error("Failed to parse response:", responseText);
      // If Claude refused the request, return the refusal message
      if (responseText && responseText.length > 0) {
        return NextResponse.json(
          { error: responseText },
          { status: 400 }
        );
      }
      throw new Error("Failed to parse AI response");
    }

    // Detect bias before performing the coin flip
    const biasAnalysis = detectBias(
      clarifyingAnswers,
      initialChoice,
      analysisData.optionAnalyses
    );

    // Perform the weighted "coin flip"
    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedOption = analysisData.optionAnalyses[0];

    for (const optAnalysis of analysisData.optionAnalyses) {
      cumulative += optAnalysis.weight;
      if (random <= cumulative) {
        selectedOption = optAnalysis;
        break;
      }
    }

    // Save decision to database
    const decision = await prisma.decision.create({
      data: {
        userId,
        question,
        options: JSON.stringify(options),
        analysis: analysisData.analysis,
        weights: JSON.stringify(
          analysisData.optionAnalyses.map((oa: any) => ({
            option: oa.option,
            weight: oa.weight,
          }))
        ),
        result: selectedOption.option,
        explanation: analysisData.recommendation,
        initialChoice: initialChoice || null,
        finalChoice: null, // Will be updated later
        clarifyingAnswers: clarifyingAnswers && clarifyingAnswers.length > 0
          ? JSON.stringify(clarifyingAnswers)
          : null,
      },
    });

    return NextResponse.json({
      decision: {
        id: decision.id,
        analysis: analysisData.analysis,
        optionAnalyses: analysisData.optionAnalyses,
        keyFactors: analysisData.keyFactors,
        result: selectedOption.option,
        recommendation: analysisData.recommendation,
        bias: biasAnalysis,
      },
    });
  } catch (error) {
    console.error("Decision error:", error);
    return NextResponse.json(
      { error: "Failed to analyze decision" },
      { status: 500 }
    );
  }
}
