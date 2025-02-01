import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../../lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { id, streamId } = context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { createdBy: true }
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    const stream = await prisma.tournamentStream.findUnique({
      where: { id: streamId }
    });

    if (!stream) {
      return NextResponse.json({ message: "Stream not found" }, { status: 404 });
    }

    // Only allow deletion by tournament creator
    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creators can remove streams" },
        { status: 403 }
      );
    }

    await prisma.tournamentStream.delete({
      where: { id: streamId }
    });

    return NextResponse.json({ message: "Stream removed successfully" });
  } catch (error) {
    console.error("Stream deletion error:", error);
    return NextResponse.json(
      { message: "Failed to remove stream" },
      { status: 500 }
    );
  }
}