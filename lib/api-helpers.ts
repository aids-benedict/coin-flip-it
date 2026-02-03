import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Check if a value is a NextResponse error
 */
export function isErrorResponse(value: any): value is NextResponse {
  return value instanceof NextResponse;
}

/**
 * Require authentication and return userId or error response
 */
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { userId: user.id };
}

/**
 * Verify a decision exists and belongs to the authenticated user
 */
export async function verifyDecisionOwnership(
  decisionId: string,
  userId: string
): Promise<{ success: true } | NextResponse> {
  const decision = await prisma.decision.findUnique({
    where: { id: decisionId },
    select: { userId: true },
  });

  if (!decision) {
    return NextResponse.json(
      { error: "Decision not found" },
      { status: 404 }
    );
  }

  if (decision.userId !== userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  return { success: true };
}
