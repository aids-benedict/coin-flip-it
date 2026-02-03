import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, isErrorResponse, verifyDecisionOwnership } from "@/lib/api-helpers";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    const { id } = await params;

    // Verify the decision belongs to the user
    const verificationResult = await verifyDecisionOwnership(id, userId);
    if (isErrorResponse(verificationResult)) return verificationResult;

    // Fetch the decision
    const decision = await prisma.decision.findUnique({
      where: { id },
    });

    return NextResponse.json({ decision });
  } catch (error) {
    console.error("Get decision error:", error);
    return NextResponse.json(
      { error: "Failed to fetch decision" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (isErrorResponse(authResult)) return authResult;
    const { userId } = authResult;

    const { id } = await params;

    // Verify the decision belongs to the user
    const verificationResult = await verifyDecisionOwnership(id, userId);
    if (isErrorResponse(verificationResult)) return verificationResult;

    // Delete the decision
    await prisma.decision.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete decision error:", error);
    return NextResponse.json(
      { error: "Failed to delete decision" },
      { status: 500 }
    );
  }
}
