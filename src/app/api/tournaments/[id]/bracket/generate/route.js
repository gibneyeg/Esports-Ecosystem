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
          orderBy: {
            seedNumber: 'asc',
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

    let participants = [...tournament.participants];
    
    // Prepare participants based on seeding type
    if (tournament.seedingType === "MANUAL" && tournament.hasManualSeeding) {
      // Already sorted by seed number in the query above
      console.log("Using manual seeding");
    } else if (tournament.seedingType === "RANDOM") {
      // Shuffle participants for random seeding
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }
    }
    // For SKILL_BASED, we would need external data source for player skills
    else if (tournament.seedingType === "SKILL_BASED") {
      // Sort by user points as a simple implementation
      participants.sort((a, b) => b.user.points - a.user.points);
    }

    // Function to generate standard bracket
    const generateStandardBracket = async (participants) => {
      const numParticipants = participants.length;
      console.log(`Generating bracket for ${numParticipants} participants`);
      
      // Calculate number of rounds needed
      const numRounds = Math.ceil(Math.log2(numParticipants));
      const perfectBracketSize = Math.pow(2, numRounds);
      const numByes = perfectBracketSize - numParticipants;
      
      console.log(`Rounds needed: ${numRounds}, Perfect bracket size: ${perfectBracketSize}, Byes: ${numByes}`);
      
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
      
      // Create seeded positions for a standard bracket
      // This follows the traditional tournament bracket seeding
      // where #1 and #2 seeds are on opposite sides
      const seedPositions = [];
      const getRoundPosFromSeed = (seed, totalParticipants) => {
        if (totalParticipants <= 1) return 0;
        
        // Seed position calculation for power-of-2 brackets
        if (seed === 1) return 0; // #1 seed at top
        if (seed === 2) return totalParticipants - 1; // #2 seed at bottom
        
        if (seed % 2 === 1) {
          // Odd seeds go in top half, paired with corresponding even seed
          return Math.floor(seed / 2);
        } else {
          // Even seeds go in bottom half, paired with corresponding odd seed
          return totalParticipants - 1 - Math.floor((seed - 1) / 2);
        }
      };
      
      // For each participant, get their position in the bracket
      for (let i = 0; i < perfectBracketSize; i++) {
        seedPositions[i] = null; // Initialize with null (bye)
      }
      
      // Assign participants to their positions
      for (let i = 0; i < participants.length; i++) {
        const seed = i + 1; // 1-based seeding
        const pos = getRoundPosFromSeed(seed, perfectBracketSize);
        seedPositions[pos] = participants[i];
        console.log(`Seed #${seed} (${participants[i].user.name}) goes to position ${pos}`);
      }
      
      // First round matches
      const firstRoundMatchCount = perfectBracketSize / 2;
      let matches = [];
      
      for (let i = 0; i < firstRoundMatchCount; i++) {
        const player1Pos = i * 2;
        const player2Pos = i * 2 + 1;
        
        const matchData = {
          bracketId: bracketIds[0],
          position: i,
          status: "PENDING",
        };
        
        const player1 = seedPositions[player1Pos];
        const player2 = seedPositions[player2Pos];
        
        if (player1) {
          matchData.player1Id = player1.user.id;
        }
        
        if (player2) {
          matchData.player2Id = player2.user.id;
        }
        
        // If one player is null, it's a bye match
        if ((player1 && !player2) || (!player1 && player2)) {
          matchData.status = "COMPLETED";
          matchData.score = "W-Bye";
          matchData.completedTime = new Date();
          
          if (player1) {
            matchData.winnerId = player1.user.id;
          } else if (player2) {
            matchData.winnerId = player2.user.id;
          }
        }
        
        console.log(`Creating match ${i}:`, {
          player1: player1 ? player1.user.name : "Bye",
          player2: player2 ? player2.user.name : "Bye",
          status: matchData.status
        });
        
        const match = await prisma.match.create({
          data: matchData,
        });
        
        matches.push(match);
        
        // If this is a bye match, advance the player to the next round
        if (matchData.status === "COMPLETED" && matchData.winnerId) {
          await advanceToNextRound(bracketIds, 0, i, matchData.winnerId);
        }
      }
      
      return matches;
    };
    
    // Helper function to advance a winner to the next round
    const advanceToNextRound = async (bracketIds, currentRound, currentPosition, winnerId) => {
      const nextRound = currentRound + 1;
      if (nextRound >= bracketIds.length) return; // No more rounds
      
      const nextPosition = Math.floor(currentPosition / 2);
      const isPlayer1 = currentPosition % 2 === 0;
      
      // Find or create the match in the next round
      const existingMatch = await prisma.match.findFirst({
        where: {
          bracketId: bracketIds[nextRound],
          position: nextPosition,
        },
      });
      
      if (existingMatch) {
        // Update existing match
        await prisma.match.update({
          where: { id: existingMatch.id },
          data: {
            player1Id: isPlayer1 ? winnerId : existingMatch.player1Id,
            player2Id: !isPlayer1 ? winnerId : existingMatch.player2Id,
          },
        });
        
        // If both players are now set and one was a bye, auto-advance
        const updatedMatch = await prisma.match.findUnique({
          where: { id: existingMatch.id },
        });
        
        if (updatedMatch.player1Id && updatedMatch.player2Id) {
          // Check if either player was from a bye match
          const player1Match = await prisma.match.findFirst({
            where: { 
              bracketId: bracketIds[currentRound],
              winnerId: updatedMatch.player1Id,
              status: "COMPLETED",
              score: "W-Bye"
            }
          });
          
          const player2Match = await prisma.match.findFirst({
            where: { 
              bracketId: bracketIds[currentRound],
              winnerId: updatedMatch.player2Id,
              status: "COMPLETED",
              score: "W-Bye"
            }
          });
          
          // If both were byes, consider this a bye too and advance
          if (player1Match && player2Match) {
            await prisma.match.update({
              where: { id: updatedMatch.id },
              data: {
                status: "COMPLETED",
                score: "W-Bye",
                winnerId: updatedMatch.player1Id, // Default to player1
                completedTime: new Date(),
              },
            });
            
            await advanceToNextRound(bracketIds, nextRound, nextPosition, updatedMatch.player1Id);
          }
        }
      } else {
        // Create new match
        await prisma.match.create({
          data: {
            bracketId: bracketIds[nextRound],
            position: nextPosition,
            status: "PENDING",
            player1Id: isPlayer1 ? winnerId : undefined,
            player2Id: !isPlayer1 ? winnerId : undefined,
          },
        });
      }
    };
    
    // Generate bracket based on format
    let generatedMatches;
    
    if (format === "SINGLE_ELIMINATION") {
      generatedMatches = await generateStandardBracket(participants);
    } else {
      // Fallback to single elimination for other formats
      generatedMatches = await generateStandardBracket(participants);
    }
    
    // Create empty matches for subsequent rounds
    for (let round = 1; round < Math.ceil(Math.log2(participants.length)); round++) {
      const bracketId = (await prisma.tournamentBracket.findFirst({
        where: { tournamentId: id, round }
      })).id;
      
      const matchCount = Math.pow(2, Math.ceil(Math.log2(participants.length)) - round - 1);
      
      for (let position = 0; position < matchCount; position++) {
        // Check if match already exists
        const existingMatch = await prisma.match.findFirst({
          where: {
            bracketId,
            position,
          },
        });
        
        if (!existingMatch) {
          await prisma.match.create({
            data: {
              bracketId,
              position,
              status: "PENDING",
            },
          });
        }
      }
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
    
    return NextResponse.json({
      tournamentId: id,
      format,
      rounds: updatedTournament.brackets.length,
      matches,
    });
  } catch (error) {
    console.error("Bracket generation error:", error);
    return NextResponse.json(
      { message: "Failed to generate bracket", error: error.message },
      { status: 500 }
    );
  }
}