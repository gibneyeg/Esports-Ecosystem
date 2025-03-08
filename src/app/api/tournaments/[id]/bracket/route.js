import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

// Updated POST function for tournament bracket route.js

export async function POST(request, context) {
  try {
    const { id } = context.params;

    // Get the authenticated user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Verify that the authenticated user is the tournament creator
    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creator can update bracket" },
        { status: 403 }
      );
    }

    // Parse the request body
    const bracketData = await request.json();
    console.log("Received bracket data:", JSON.stringify(bracketData, null, 2));

    // Clear existing brackets and matches
    await prisma.match.deleteMany({
      where: {
        bracket: {
          tournamentId: id
        }
      },
    });

    await prisma.tournamentBracket.deleteMany({
      where: {
        tournamentId: id
      },
    });

    // Create new brackets and matches
    for (let roundIndex = 0; roundIndex < bracketData.rounds.length; roundIndex++) {
      const round = bracketData.rounds[roundIndex];

      // Skip rounds with no matches
      if (!round.matches || round.matches.length === 0) {
        continue;
      }

      console.log(`Creating bracket for round ${roundIndex}: ${round.name}`);

      // Create bracket for this round
      const bracket = await prisma.tournamentBracket.create({
        data: {
          tournamentId: id,
          round: roundIndex,
          position: 0, // Default position
        },
      });

      // Create matches for this round
      for (let matchIndex = 0; matchIndex < round.matches.length; matchIndex++) {
        const match = round.matches[matchIndex];

        // Determine match status based on if it has a winner
        const matchStatus = match.winnerId ? "COMPLETED" : "PENDING";

        console.log(`Creating match in round ${roundIndex}, position ${match.position}`);

        await prisma.match.create({
          data: {
            bracketId: bracket.id,
            position: match.position,
            status: matchStatus,
            player1Id: match.player1?.id || null,
            player2Id: match.player2?.id || null,
            winnerId: match.winnerId || null,
            // If the match is completed, add a completion time and score
            ...(matchStatus === "COMPLETED" && {
              completedTime: new Date(),
              score: "W-L" // Default score format
            })
          },
        });
      }
    }

    // If a tournament winner is declared, update the tournament record
    if (bracketData.tournamentWinnerId) {
      await prisma.tournament.update({
        where: { id },
        data: {
          winnerId: bracketData.tournamentWinnerId,
          status: "COMPLETED"
        }
      });
    }

    // Get updated tournament with brackets
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        brackets: {
          include: {
            matches: {
              include: {
                player1: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                  }
                },
                player2: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                  }
                },
                winner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                  }
                },
              },
            },
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        }
      },
    });

    // Flatten matches for easier consumption by frontend
    const matches = [];

    updatedTournament.brackets.forEach(bracket => {
      bracket.matches.forEach(match => {
        matches.push({
          id: match.id,
          round: bracket.round,
          position: match.position,
          player1: match.player1,
          player2: match.player2,
          winner: match.winner,
          score: match.score,
          status: match.status,
          completedTime: match.completedTime,
        });
      });
    });

    // Sort matches by round and position
    matches.sort((a, b) => {
      if (a.round !== b.round) {
        return a.round - b.round;
      }
      return a.position - b.position;
    });

    console.log(`Returning ${matches.length} matches for the frontend`);

    return NextResponse.json({
      tournamentId: id,
      format: updatedTournament.format,
      rounds: updatedTournament.brackets.length,
      matches,
      winner: updatedTournament.winner,
      status: updatedTournament.status
    });
  } catch (error) {
    console.error("Bracket save error:", error);
    return NextResponse.json(
      { message: "Failed to save bracket data", error: error.message },
      { status: 500 }
    );
  }
}
// New GET handler for retrieving bracket data
export async function GET(request, context) {
  try {
    const { id } = context.params;

    // Get tournament with brackets and matches
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        brackets: {
          include: {
            matches: {
              include: {
                player1: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                  }
                },
                player2: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                  }
                },
                winner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                  }
                },
              },
            },
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        }
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // If there are no brackets yet, return empty array
    if (!tournament.brackets || tournament.brackets.length === 0) {
      return NextResponse.json({
        tournamentId: id,
        format: tournament.format,
        rounds: 0,
        matches: [],
        winner: tournament.winner,
        status: tournament.status
      });
    }

    // Flatten matches for easier consumption by frontend
    const matches = [];

    tournament.brackets.forEach(bracket => {
      bracket.matches.forEach(match => {
        matches.push({
          id: match.id,
          round: bracket.round,
          position: match.position,
          player1: match.player1,
          player2: match.player2,
          winner: match.winner,
          score: match.score,
          status: match.status,
          completedTime: match.completedTime,
        });
      });
    });

    // Sort matches by round and position
    matches.sort((a, b) => {
      if (a.round !== b.round) {
        return a.round - b.round;
      }
      return a.position - b.position;
    });

    return NextResponse.json({
      tournamentId: id,
      format: tournament.format,
      rounds: tournament.brackets.length,
      matches,
      winner: tournament.winner,
      status: tournament.status
    });
  } catch (error) {
    console.error("Bracket fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch bracket data", error: error.message },
      { status: 500 }
    );
  }
}