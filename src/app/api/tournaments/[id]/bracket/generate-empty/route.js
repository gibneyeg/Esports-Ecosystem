import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../../lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

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
        participants: {
          include: {
            user: true,
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

    // Verify that the authenticated user is the tournament creator
    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creator can generate brackets" },
        { status: 403 }
      );
    }

    // Verify tournament has enough participants
    if (tournament.participants.length < 2) {
      return NextResponse.json(
        { message: "At least 2 participants are required for bracket generation" },
        { status: 400 }
      );
    }

    // Create bracket based on tournament format
    const format = tournament.format || "SINGLE_ELIMINATION";
    const numParticipants = tournament.participants.length;
    
    // Calculate rounds needed
    const numRounds = Math.ceil(Math.log2(numParticipants));
    const perfectBracketSize = Math.pow(2, numRounds);
    
    console.log(`Generating empty bracket for ${numParticipants} participants`);
    console.log(`Rounds needed: ${numRounds}, Perfect bracket size: ${perfectBracketSize}`);
    
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
    
    // Create brackets for each round
    const bracketIds = [];
    for (let round = 0; round < numRounds; round++) {
      const bracket = await prisma.tournamentBracket.create({
        data: {
          tournamentId: id,
          round,
          position: 0, // Default position since it's required
        },
      });
      bracketIds[round] = bracket.id;
    }
    
    let matches = [];
    
    // Create first round matches (all empty)
    const firstRoundMatchCount = perfectBracketSize / 2;
    for (let i = 0; i < firstRoundMatchCount; i++) {
      const match = await prisma.match.create({
        data: {
          bracketId: bracketIds[0],
          position: i,
          status: "PENDING",
        },
      });
      matches.push(match);
    }
    
    // Create empty matches for subsequent rounds
    for (let round = 1; round < numRounds; round++) {
      const matchCount = Math.pow(2, numRounds - round - 1);
      
      for (let position = 0; position < matchCount; position++) {
        const match = await prisma.match.create({
          data: {
            bracketId: bracketIds[round],
            position,
            status: "PENDING",
          },
        });
        matches.push(match);
      }
    }
    
    // Get updated tournament with brackets
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        brackets: {
          include: {
            matches: true,
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
              }
            }
          }
        }
      },
    });
    
    // Flatten matches for easier consumption by frontend
    const flattenedMatches = [];
    
    updatedTournament.brackets.forEach(bracket => {
      bracket.matches.forEach(match => {
        flattenedMatches.push({
          id: match.id,
          round: bracket.round,
          position: match.position,
          player1: match.player1Id ? { id: match.player1Id } : null,
          player2: match.player2Id ? { id: match.player2Id } : null,
          status: match.status,
        });
      });
    });
    
    // Sort matches by round and position
    flattenedMatches.sort((a, b) => {
      if (a.round !== b.round) {
        return a.round - b.round;
      }
      return a.position - b.position;
    });
    
    return NextResponse.json({
      tournamentId: id,
      format,
      rounds: updatedTournament.brackets.length,
      matches: flattenedMatches,
      participants: updatedTournament.participants.map(p => ({
        id: p.user.id,
        name: p.user.name || p.user.username || p.user.email,
        participantId: p.id
      }))
    });
  } catch (error) {
    console.error("Bracket generation error:", error);
    return NextResponse.json(
      { message: "Failed to generate bracket", error: error.message },
      { status: 500 }
    );
  }
}