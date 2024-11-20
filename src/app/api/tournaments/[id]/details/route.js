import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function GET(request, context) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const tournamentId = resolvedParams.id;

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
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

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Add computed fields
    const enrichedTournament = {
      ...tournament,
      participantCount: tournament.participants.length,
      isRegistrationOpen:
        tournament.participants.length < tournament.maxPlayers &&
        tournament.status === "UPCOMING" &&
        new Date() < new Date(tournament.startDate),
    };

    return NextResponse.json(enrichedTournament);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tournament details", error: error.message },
      { status: 500 }
    );
  }
}
