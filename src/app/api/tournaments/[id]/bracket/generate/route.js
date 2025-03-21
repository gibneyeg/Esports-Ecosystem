import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../../lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    const { id } = context.params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

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


    // check tournament has enough participants
    if (tournament.participants.length < 2) {
      return NextResponse.json(
        { message: "At least 2 participants are required for bracket generation" },
        { status: 400 }
      );
    }

    const format = tournament.format || "SINGLE_ELIMINATION";
    let participants = [...tournament.participants];

    //  seeding based on tournament config
    if (tournament.seedingType === "MANUAL" && tournament.hasManualSeeding) {
    } else if (tournament.seedingType === "RANDOM") {
      // Shuffle participants randomly
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }
    } else if (tournament.seedingType === "SKILL_BASED") {
      participants.sort((a, b) => b.user.points - a.user.points);
    }

    // Helper function to advance a winner to the next round
    const advanceToNextRound = async (bracketIds, currentRound, currentPosition, winnerId) => {
      const nextRound = currentRound + 1;
      if (nextRound >= bracketIds.length) return;

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
        await prisma.match.update({
          where: { id: existingMatch.id },
          data: {
            player1Id: isPlayer1 ? winnerId : existingMatch.player1Id,
            player2Id: !isPlayer1 ? winnerId : existingMatch.player2Id,
          },
        });

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

          if (player1Match && player2Match) {
            await prisma.match.update({
              where: { id: updatedMatch.id },
              data: {
                status: "COMPLETED",
                score: "W-Bye",
                winnerId: updatedMatch.player1Id,
                completedTime: new Date(),
              },
            });

            await advanceToNextRound(bracketIds, nextRound, nextPosition, updatedMatch.player1Id);
          }
        }
      } else {
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

    // Function to generate standard bracket with seeding and byes
    const generateStandardBracket = async (participants) => {
      const numParticipants = participants.length;

      const numRounds = Math.ceil(Math.log2(numParticipants));
      const perfectBracketSize = Math.pow(2, numRounds);


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

      const bracketIds = [];
      for (let round = 0; round < numRounds; round++) {
        const bracket = await prisma.tournamentBracket.create({
          data: {
            tournamentId: id,
            round,
            position: 0,
          },
        });
        bracketIds[round] = bracket.id;
      }

      const getRoundPosFromSeed = (seed, totalParticipants) => {
        if (totalParticipants <= 1) return 0;

        if (seed === 1) return 0;
        if (seed === 2) return totalParticipants - 1;

        if (seed % 2 === 1) {
          // Odd seeds go in top half
          return Math.floor(seed / 2);
        } else {
          // Even seeds go in bottom half
          return totalParticipants - 1 - Math.floor((seed - 1) / 2);
        }
      };

      const seedPositions = new Array(perfectBracketSize).fill(null);

      // Assign participants to their positions
      for (let i = 0; i < participants.length; i++) {
        const seed = i + 1; // 1-based seeding
        const pos = getRoundPosFromSeed(seed, perfectBracketSize);
        seedPositions[pos] = participants[i];
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


        const match = await prisma.match.create({
          data: matchData,
        });

        matches.push(match);

        if (matchData.status === "COMPLETED" && matchData.winnerId) {
          await advanceToNextRound(bracketIds, 0, i, matchData.winnerId);
        }
      }

      // Create empty matches for subsequent rounds
      for (let round = 1; round < numRounds; round++) {
        const matchCount = Math.pow(2, numRounds - round - 1);

        for (let position = 0; position < matchCount; position++) {
          const existingMatch = await prisma.match.findFirst({
            where: {
              bracketId: bracketIds[round],
              position,
            },
          });

          if (!existingMatch) {
            await prisma.match.create({
              data: {
                bracketId: bracketIds[round],
                position,
                status: "PENDING",
              },
            });
          }
        }
      }

      return matches;
    };

    // Generate bracket based on format - TODO others
    if (format === "SINGLE_ELIMINATION") {
      await generateStandardBracket(participants);
    } else {
      // Fallback to single elimination for other formats
      await generateStandardBracket(participants);
    }

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

    // Flatten matches for easier use by frontend
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