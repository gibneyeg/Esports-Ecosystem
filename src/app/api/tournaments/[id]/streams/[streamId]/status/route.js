import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../../../lib/prisma";
import { authOptions } from "../../../../../auth/[...nextauth]/route";

export async function PUT(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { id, streamId } = context.params;
    const { isLive } = await request.json();

    // Validate the tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { createdBy: true }
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    // Only allow tournament creator to update stream status
    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creators can update stream status" },
        { status: 403 }
      );
    }

    // Update the stream status
    const stream = await prisma.tournamentStream.update({
      where: { id: streamId },
      data: { isLive }
    });

    return NextResponse.json(stream);
  } catch (error) {
    console.error("Stream status update error:", error);
    return NextResponse.json(
      { message: "Failed to update stream status" },
      { status: 500 }
    );
  }
}