import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isErrorResponse } from "@/lib/api-helpers";

export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    // Delete all in-progress decisions (where finalChoice is null)
    const result = await prisma.decision.deleteMany({
      where: {
        userId,
        finalChoice: null,
      },
    });

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete decisions" },
      { status: 500 }
    );
  }
}
