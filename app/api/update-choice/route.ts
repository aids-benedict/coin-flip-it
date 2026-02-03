import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isErrorResponse } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    const { decisionId, finalChoice } = await request.json();

    if (!decisionId || !finalChoice) {
      return NextResponse.json(
        { error: "Decision ID and final choice required" },
        { status: 400 }
      );
    }

    // Update the decision with final choice
    const decision = await prisma.decision.update({
      where: {
        id: decisionId,
        userId, // Ensure user owns this decision
      },
      data: {
        finalChoice: finalChoice,
      },
    });

    return NextResponse.json({ success: true, decision });
  } catch (error) {
    console.error("Update choice error:", error);
    return NextResponse.json(
      { error: "Failed to update choice" },
      { status: 500 }
    );
  }
}
