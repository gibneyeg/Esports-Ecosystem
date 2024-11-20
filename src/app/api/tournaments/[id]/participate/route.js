import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const tournamentId = resolvedParams.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { participants: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check if already participating
    const existingParticipant = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId,
        userId: user.id,
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { message: "Already participating in tournament" },
        { status: 400 }
      );
    }

    // Join tournament
    await prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: user.id,
      },
    });

    // Return updated tournament data
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        },
      },
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Tournament join error:", error);
    return NextResponse.json(
      { message: "Failed to join tournament", error: error.message },
      { status: 500 }
    );
  }
}
