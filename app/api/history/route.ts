import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isErrorResponse } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    // Fetch all decisions for the user, ordered by most recent first
    const decisions = await prisma.decision.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        question: true,
        options: true,
        result: true,
        initialChoice: true,
        finalChoice: true,
        analysis: true,
        explanation: true,
        weights: true,
        clarifyingAnswers: true,
        createdAt: true,
      },
    });

    // Parse JSON fields and format response
    const formattedDecisions = decisions.map((decision) => {
      let parsedOptions: string[] = [];
      let parsedWeights: Array<{ option: string; weight: number }> = [];
      let parsedClarifyingAnswers: Array<{ question: string; answer: string }> | null = null;

      try {
        parsedOptions = JSON.parse(decision.options);
      } catch (e) {
        parsedOptions = [];
      }

      try {
        parsedWeights = JSON.parse(decision.weights);
      } catch (e) {
        parsedWeights = [];
      }

      try {
        if (decision.clarifyingAnswers) {
          parsedClarifyingAnswers = JSON.parse(decision.clarifyingAnswers);
        }
      } catch (e) {
        parsedClarifyingAnswers = null;
      }

      return {
        id: decision.id,
        question: decision.question,
        options: parsedOptions,
        result: decision.result,
        initialChoice: decision.initialChoice,
        finalChoice: decision.finalChoice,
        analysis: decision.analysis,
        explanation: decision.explanation,
        weights: parsedWeights,
        clarifyingAnswers: parsedClarifyingAnswers,
        createdAt: decision.createdAt,
      };
    });

    return NextResponse.json({
      decisions: formattedDecisions,
    });
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch decision history" },
      { status: 500 }
    );
  }
}
