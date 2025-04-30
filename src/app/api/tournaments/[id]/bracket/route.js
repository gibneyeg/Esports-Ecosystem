import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

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

    // Handle different tournament formats differently
    if (tournament.format === "ROUND_ROBIN") {
      return await handleRoundRobinBracket(id, bracketData);
    } else if (tournament.format === "SWISS") {
      return await handleSwissBracket(id, bracketData);
    } else {
      return await handleEliminationBracket(id, bracketData);
    }
  } catch (error) {
    console.error("Bracket save error:", error);
    return NextResponse.json(
      { message: "Failed to save bracket data", error: error.message },
      { status: 500 }
    );
  }
}

// Handler for Round Robin format
async function handleRoundRobinBracket(tournamentId, bracketData) {
  try {
    const currentTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        formatSettings: true,
        format: true,
        prizePool: true
      }
    });

    let formatSettingsToSave = null;

    // Check if we have format settings in the bracket data
    if (bracketData.formatSettings) {
      // Convert to JSON object
      formatSettingsToSave = typeof bracketData.formatSettings === 'string'
        ? JSON.parse(bracketData.formatSettings)
        : bracketData.formatSettings;

    }
    else if (currentTournament?.formatSettings) {
      formatSettingsToSave = typeof currentTournament.formatSettings === 'string'
        ? JSON.parse(currentTournament.formatSettings)
        : currentTournament.formatSettings;
    }

    await prisma.$transaction([
      prisma.match.deleteMany({
        where: {
          bracket: {
            tournamentId
          }
        },
      }),
      prisma.tournamentBracket.deleteMany({
        where: {
          tournamentId
        },
      })
    ]);

    if (formatSettingsToSave) {

      try {
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            formatSettings: formatSettingsToSave,
          }
        });
      } catch (error) {
        console.error("Error updating tournament format settings:", error);
      }
    }

    const groups = new Set();
    bracketData.matches.forEach(match => {
      if (match.groupId) {
        groups.add(match.groupId);
      }
    });

    if (groups.size === 0) {
      groups.add("default");
    }

    const groupBrackets = {};
    let bracketIndex = 0;

    for (const groupId of groups) {

      const bracket = await prisma.tournamentBracket.create({
        data: {
          tournamentId,
          round: bracketIndex,
          position: 0,
        },
      });

      groupBrackets[groupId] = bracket.id;
      bracketIndex++;
    }

    // Wait to ensure all brackets are created
    await new Promise(resolve => setTimeout(resolve, 100));

    for (const match of bracketData.matches) {
      if (!match.player1 || !match.player2) {
        continue;
      }

      const groupId = match.groupId || "default";
      const bracketId = groupBrackets[groupId];

      if (!bracketId) {
        console.warn(`No bracket found for group ${groupId}, skipping match`);
        continue;
      }

      // Properly determine match status based on if it has a winner or is a draw
      const isDraw = match.isDraw === true;
      const hasWinner = !isDraw && match.winnerId;
      const matchStatus = (hasWinner || isDraw) ? "COMPLETED" : "PENDING";

      try {
        // Ensure the data we're saving is consistent
        const matchData = {
          bracketId,
          position: match.position,
          status: matchStatus,
          player1Id: match.player1.id,
          player2Id: match.player2.id,
          winnerId: isDraw ? null : match.winnerId,
          score: match.score || (isDraw ? "Draw" : null),
          roundRobinData: JSON.stringify({
            round: match.round,
            isDraw: isDraw,
            groupId: match.groupId,
            groupName: match.groupName
          }),
        };

        if (matchStatus === "COMPLETED") {
          matchData.completedTime = new Date();
        }

        await prisma.match.create({ data: matchData });
      } catch (error) {
        console.error("Error creating match:", error);
        console.error("Match data:", {
          bracketId,
          position: match.position,
          status: matchStatus,
          player1Id: match.player1.id,
          player2Id: match.player2.id,
          winnerId: isDraw ? null : match.winnerId,
          score: match.score,
          isDraw
        });
      }
    }


    if (bracketData.tournamentWinnerId) {

      try {
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            winnerId: bracketData.tournamentWinnerId,
            status: "COMPLETED"
          }
        });

        if (bracketData.winners && bracketData.winners.length > 0) {

          await prisma.tournamentWinner.deleteMany({
            where: { tournamentId }
          });

          const tournamentInfo = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { prizePool: true }
          });

          for (const winner of bracketData.winners) {
            try {
              await prisma.tournamentWinner.create({
                data: {
                  tournamentId,
                  userId: winner.userId,
                  position: winner.position,
                  prizeMoney: calculatePrizeMoney(tournamentInfo.prizePool, winner.position)
                }
              });
            } catch (error) {
              console.error(`Error creating tournament winner at position ${winner.position}:`, error);
            }
          }
        }
      } catch (error) {
        console.error("Error updating tournament winner:", error);
      }
    } else {
    }

    const updatedTournament = await getUpdatedTournament(tournamentId);
    return formatTournamentResponse(updatedTournament);
  } catch (error) {
    console.error("Round Robin bracket save error:", error);
    throw error;
  }
}

// Handler for Swiss format brackets
async function handleSwissBracket(tournamentId, bracketData) {
  try {
    const { rounds, currentRound, winners } = bracketData;

    // Transaction to update bracket data and winners
    await prisma.$transaction(async (tx) => {
      // Check if bracket data exists
      const existingBracket = await tx.tournamentSwissBracket.findUnique({
        where: { tournamentId }
      });

      if (existingBracket) {
        // Update existing bracket
        await tx.tournamentSwissBracket.update({
          where: { tournamentId },
          data: {
            currentRound: currentRound || 0,
            updatedAt: new Date()
          }
        });

        // Delete existing rounds and matches to replace with new data
        await tx.tournamentSwissMatch.deleteMany({
          where: {
            round: {
              bracketId: existingBracket.id
            }
          }
        });

        await tx.tournamentSwissRound.deleteMany({
          where: {
            bracketId: existingBracket.id
          }
        });
      } else {
        // Create new bracket
        await tx.tournamentSwissBracket.create({
          data: {
            tournamentId,
            currentRound: currentRound || 0
          }
        });
      }

      // Get the bracket record (either existing or newly created)
      const bracket = await tx.tournamentSwissBracket.findUnique({
        where: { tournamentId }
      });

      // Create rounds and matches
      if (rounds && rounds.length > 0) {
        for (let i = 0; i < rounds.length; i++) {
          const round = rounds[i];

          // Create round
          const createdRound = await tx.tournamentSwissRound.create({
            data: {
              bracketId: bracket.id,
              roundNumber: i,
            }
          });

          // Create matches for this round
          if (round.matches && round.matches.length > 0) {
            for (let j = 0; j < round.matches.length; j++) {
              const match = round.matches[j];

              await tx.tournamentSwissMatch.create({
                data: {
                  roundId: createdRound.id,
                  player1Id: match.player1Id,
                  player2Id: match.player2Id,
                  result: match.result,
                  position: j  // Use the array index as the position
                }
              });
            }
          }
        }
      }

      // Update winners if provided
      if (winners && winners.length > 0) {
        // Delete existing winners
        await tx.tournamentWinner.deleteMany({
          where: { tournamentId }
        });

        // Get the tournament prize pool information
        const tournamentInfo = await tx.tournament.findUnique({
          where: { id: tournamentId },
          select: { prizePool: true }
        });

        // Create new winners
        for (const winner of winners) {
          // Handle team tournaments vs individual tournaments
          if (winner.teamId) {
            await tx.tournamentWinner.create({
              data: {
                tournamentId,
                teamId: winner.teamId,
                position: winner.position,
                prizeMoney: calculatePrizeMoney(tournamentInfo.prizePool, winner.position)
              }
            });
          } else if (winner.userId) {
            await tx.tournamentWinner.create({
              data: {
                tournamentId,
                userId: winner.userId,
                position: winner.position,
                prizeMoney: calculatePrizeMoney(tournamentInfo.prizePool, winner.position)
              }
            });
          }
        }

        // Update tournament status to completed
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { status: "COMPLETED" }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Swiss bracket saved successfully"
    });
  } catch (error) {
    console.error("Swiss bracket save error:", error);
    throw error;
  }
}

// Helper function to calculate prize money based on position
function calculatePrizeMoney(prizePool, position) {
  switch (position) {
    case 1:
      return prizePool * 0.5; // 50% for first place
    case 2:
      return prizePool * 0.3; // 30% for second place
    case 3:
      return prizePool * 0.2; // 20% for third place
    default:
      return 0;
  }
}

// Handler for elimination format brackets
async function handleEliminationBracket(tournamentId, bracketData) {
  try {
    // Delete existing brackets and matches for this tournament
    await prisma.match.deleteMany({
      where: {
        bracket: {
          tournamentId: tournamentId
        }
      }
    });

    await prisma.tournamentBracket.deleteMany({
      where: { tournamentId: tournamentId }
    });

    // Process the matches from bracketData
    if (bracketData.matches && bracketData.matches.length > 0) {
      for (const matchData of bracketData.matches) {
        // Create the bracket if it doesn't exist
        let bracket = await prisma.tournamentBracket.findFirst({
          where: {
            tournamentId: tournamentId,
            round: matchData.round,
            position: matchData.position
          }
        });

        if (!bracket) {
          bracket = await prisma.tournamentBracket.create({
            data: {
              tournamentId: tournamentId,
              round: matchData.round,
              position: matchData.position
            }
          });
        }

        // Create the match with the position field
        await prisma.match.create({
          data: {
            bracketId: bracket.id,
            status: "PENDING",
            player1Id: matchData.player1?.id || null,
            player2Id: matchData.player2?.id || null,
            winnerId: matchData.winnerId || null,
            position: matchData.matchIndex || 0, // Make sure to provide a position value
            score: matchData.score || null
          }
        });
      }
    }

    // Update tournament winner if provided
    if (bracketData.tournamentWinnerId) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: { winnerId: bracketData.tournamentWinnerId }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Elimination bracket save error:", error);
    throw new Error(`Failed to save elimination bracket: ${error.message}`);
  }
}

// Helper function to get updated tournament data
async function getUpdatedTournament(tournamentId) {
  return await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      format: true,
      formatSettings: true,
      status: true,
      winnerId: true,
      winner: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
        }
      },
      brackets: {
        include: {
          matches: {
            select: {
              id: true,
              position: true,
              status: true,
              player1Id: true,
              player2Id: true,
              winnerId: true,
              score: true,
              completedTime: true,
              roundRobinData: true,
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
      swissBracket: {
        include: {
          rounds: {
            include: {
              matches: true
            },
            orderBy: {
              roundNumber: 'asc'
            }
          }
        }
      }
    },
  });
}

// Helper function to format tournament response
function formatTournamentResponse(tournament) {
  // For Swiss format, return the specialized format
  if (tournament.format === "SWISS" && tournament.swissBracket) {
    return formatSwissTournamentResponse(tournament);
  }

  // Flatten matches for easier consumption by frontend
  const matches = [];

  tournament.brackets.forEach(bracket => {
    bracket.matches.forEach(match => {
      let roundRobinInfo = {};
      try {
        if (match.roundRobinData) {
          roundRobinInfo = JSON.parse(match.roundRobinData);
        }
      } catch (e) {
        console.warn("Failed to parse match roundRobinData:", e);
      }

      // Create the match data with all necessary properties
      const matchData = {
        id: match.id,
        round: roundRobinInfo.round !== undefined ? roundRobinInfo.round : bracket.round,
        position: match.position,
        player1: match.player1,
        player2: match.player2,
        winner: match.winner,
        winnerId: match.winnerId,
        score: match.score,
        status: match.status,
        completedTime: match.completedTime,
        isDraw: roundRobinInfo.isDraw || false,
        groupId: roundRobinInfo.groupId,
        groupName: roundRobinInfo.groupName
      };

      // IMPORTANT: Make sure winner info is correctly set
      if (match.winnerId && !match.winner) {
        matchData.winner = null;
        matchData.winnerId = match.winnerId;
        matchData.isDraw = false;
      } else if (roundRobinInfo.isDraw) {
        matchData.winner = null;
        matchData.winnerId = null;
        matchData.isDraw = true;
      }

      matches.push(matchData);
    });
  });

  // Sort matches by round and position
  matches.sort((a, b) => {
    if (a.round !== b.round) {
      return a.round - b.round;
    }
    return a.position - b.position;
  });

  let formatSettings = null;
  try {
    if (tournament.formatSettings) {
      formatSettings = typeof tournament.formatSettings === 'string'
        ? JSON.parse(tournament.formatSettings)
        : tournament.formatSettings;
    }
  } catch (e) {
    console.warn("Failed to parse tournament formatSettings:", e);
  }

  return NextResponse.json({
    tournamentId: tournament.id,
    format: tournament.format,
    formatSettings: formatSettings,
    rounds: tournament.brackets.length,
    matches,
    winner: tournament.winner,
    status: tournament.status
  });
}

// Helper function to format Swiss tournament response
function formatSwissTournamentResponse(tournament) {
  // If no Swiss bracket exists yet, return empty data structure
  if (!tournament.swissBracket) {
    return NextResponse.json({
      tournamentId: tournament.id,
      format: "SWISS",
      rounds: [],
      currentRound: 0,
      winner: tournament.winner,
      status: tournament.status
    });
  }

  // Format the rounds and matches in a structure friendly to the frontend
  const rounds = tournament.swissBracket.rounds.map(round => {
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      matches: round.matches.map(match => ({
        id: match.id,
        player1Id: match.player1Id,
        player2Id: match.player2Id,
        result: match.result,
        round: round.roundNumber,
        position: match.position
      }))
    };
  });

  let formatSettings = null;
  try {
    if (tournament.formatSettings) {
      formatSettings = typeof tournament.formatSettings === 'string'
        ? JSON.parse(tournament.formatSettings)
        : tournament.formatSettings;
    }
  } catch (e) {
    console.warn("Failed to parse tournament formatSettings:", e);
  }

  return NextResponse.json({
    tournamentId: tournament.id,
    format: "SWISS",
    formatSettings: formatSettings,
    rounds: rounds,
    currentRound: tournament.swissBracket.currentRound,
    winner: tournament.winner,
    status: tournament.status
  });
}

// New GET handler for retrieving bracket data
export async function GET(request, context) {
  try {
    const { id } = context.params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Get tournament with brackets and matches
    const tournament = await getUpdatedTournament(id);

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // If format is specifically requested, and it's SWISS
    if (format === 'SWISS') {
      // Return swiss bracket format even if empty
      return formatSwissTournamentResponse(tournament);
    }

    // If there are no brackets yet, return empty array
    if ((!tournament.brackets || tournament.brackets.length === 0) &&
      (!tournament.swissBracket)) {
      return NextResponse.json({
        tournamentId: id,
        format: tournament.format,
        rounds: 0,
        matches: [],
        winner: tournament.winner,
        status: tournament.status
      });
    }

    return formatTournamentResponse(tournament);
  } catch (error) {
    console.error("Bracket fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch bracket data", error: error.message },
      { status: 500 }
    );
  }
}