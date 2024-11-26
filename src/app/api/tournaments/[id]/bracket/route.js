import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { prisma } from "@prisma/client";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { matchId, position, participantId } = await req.json();

    // Verify tournament exists and user is creator
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: true,
        participants: {
          include: {
            user: true,
          },
        },
        brackets: {
          include: {
            matches: true,
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

    // Check if user is tournament creator
    if (tournament.createdBy.id !== session.user.id) {
      return NextResponse.json(
        { message: "Only tournament creator can update brackets" },
        { status: 403 }
      );
    }

    // Verify participant exists in tournament
    const participantExists = tournament.participants.some(
      (p) => p.id === participantId
    );
    if (!participantExists) {
      return NextResponse.json(
        { message: "Selected participant is not in this tournament" },
        { status: 400 }
      );
    }

    // Parse matchId to get round and match number
    const [round, matchNumber] = matchId.split("-").map(Number);

    // Find or create tournament bracket for this round
    let bracket = await prisma.tournamentBracket.findFirst({
      where: {
        tournamentId: id,
        round,
      },
    });

    if (!bracket) {
      bracket = await prisma.tournamentBracket.create({
        data: {
          tournamentId: id,
          round,
          position: matchNumber,
        },
      });
    }

    // Find or create match
    let match = await prisma.match.findFirst({
      where: {
        bracketId: bracket.id,
        position: matchNumber,
      },
    });

    if (!match) {
      match = await prisma.match.create({
        data: {
          bracketId: bracket.id,
          status: "PENDING",
        },
      });
    }

    // Update match with participant
    const updateData =
      position === "top"
        ? { player1Id: participantId }
        : { player2Id: participantId };

    const updatedMatch = await prisma.match.update({
      where: { id: match.id },
      data: updateData,
    });

    // Fetch updated tournament data
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: true,
        participants: {
          include: {
            user: true,
          },
        },
        brackets: {
          include: {
            matches: {
              include: {
                player1: true,
                player2: true,
                winner: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Error updating bracket:", error);
    return NextResponse.json(
      { message: "Failed to update bracket" },
      { status: 500 }
    );
  }
}

// Add match result endpoint
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { matchId, winnerId, score } = await req.json();

    // Verify tournament and permissions
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: true,
        brackets: {
          include: {
            matches: true,
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

    if (tournament.createdBy.id !== session.user.id) {
      return NextResponse.json(
        { message: "Only tournament creator can update match results" },
        { status: 403 }
      );
    }

    // Update match result
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: {
        winnerId,
        score,
        status: "COMPLETED",
        completedTime: new Date(),
      },
    });

    // Advance winner to next round if applicable
    const [currentRound, matchNumber] = matchId.split("-").map(Number);
    const nextRound = currentRound + 1;
    const nextMatchNumber = Math.floor(matchNumber / 2);

    if (nextRound < tournament.brackets.length) {
      const nextBracket = await prisma.tournamentBracket.findFirst({
        where: {
          tournamentId: id,
          round: nextRound,
        },
      });

      if (nextBracket) {
        const position = matchNumber % 2 === 0 ? "top" : "bottom";
        const updateData =
          position === "top"
            ? { player1Id: winnerId }
            : { player2Id: winnerId };

        await prisma.match.update({
          where: {
            bracketId: nextBracket.id,
            position: nextMatchNumber,
          },
          data: updateData,
        });
      }
    }

    // Fetch and return updated tournament data
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: true,
        participants: {
          include: {
            user: true,
          },
        },
        brackets: {
          include: {
            matches: {
              include: {
                player1: true,
                player2: true,
                winner: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Error updating match result:", error);
    return NextResponse.json(
      { message: "Failed to update match result" },
      { status: 500 }
    );
  }
}
