import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    // Get session with authOptions
    const session = await getServerSession(authOptions);

    // If no session, try to find user by email
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

    const params = await context.params;
    const tournamentId = params.id;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: true,
      },
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
        tournamentId: tournamentId,
        userId: user.id,
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { message: "Already participating in this tournament" },
        { status: 400 }
      );
    }

    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxPlayers) {
      return NextResponse.json(
        { message: "Tournament is full" },
        { status: 400 }
      );
    }

    // Create participant
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournament: {
          connect: { id: tournamentId },
        },
        user: {
          connect: { id: user.id },
        },
      },
      include: {
        tournament: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    // Return the updated tournament data
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
        },
      },
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Tournament participation error:", error);
    return NextResponse.json(
      { message: `Failed to join tournament: ${error.message}` },
      { status: 500 }
    );
  }
}
