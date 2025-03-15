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
    console.log("Received bracket data:", JSON.stringify(bracketData, null, 2));

    // Handle different tournament formats differently
    if (tournament.format === "ROUND_ROBIN") {
      return await handleRoundRobinBracket(id, bracketData);
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
    console.log("Processing Round Robin bracket data:", JSON.stringify(bracketData, null, 2));

    // Get the current tournament data to preserve any existing settings
    const currentTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        formatSettings: true,
        format: true,
        prizePool: true
      }
    });

    // Prepare the format settings to save
    let formatSettingsToSave = null;

    // Check if we have format settings in the bracket data
    if (bracketData.formatSettings) {
      // Convert to a proper JSON object if it's not already
      formatSettingsToSave = typeof bracketData.formatSettings === 'string'
        ? JSON.parse(bracketData.formatSettings)
        : bracketData.formatSettings;

      console.log("Using format settings from bracket data:", formatSettingsToSave);
    }
    // If not in the bracket data, try to use existing settings
    else if (currentTournament?.formatSettings) {
      // Keep the existing settings
      formatSettingsToSave = typeof currentTournament.formatSettings === 'string'
        ? JSON.parse(currentTournament.formatSettings)
        : currentTournament.formatSettings;

      console.log("Using existing format settings:", formatSettingsToSave);
    }

    // STEP 1: Clear existing brackets and matches in a transaction to ensure atomic operation
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

    // If there are format settings to save, update the tournament record
    if (formatSettingsToSave) {
      console.log("Updating tournament with format settings:", formatSettingsToSave);

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

    // STEP 2: For Round Robin, we'll create one bracket per group
    const groups = new Set();
    bracketData.matches.forEach(match => {
      if (match.groupId) {
        groups.add(match.groupId);
      }
    });

    // If no groups specified, create a default group
    if (groups.size === 0) {
      groups.add("default");
    }

    // STEP 3: Create brackets for each group
    const groupBrackets = {};
    let bracketIndex = 0;

    // Create all brackets first to ensure they exist before creating matches
    for (const groupId of groups) {
      console.log(`Creating bracket for group: ${groupId}`);

      const bracket = await prisma.tournamentBracket.create({
        data: {
          tournamentId,
          round: bracketIndex,
          position: 0,
        },
      });

      // Store the created bracket ID for this group
      groupBrackets[groupId] = bracket.id;
      bracketIndex++;
    }

    // Wait to ensure all brackets are created
    await new Promise(resolve => setTimeout(resolve, 100));

    // STEP 4: Create matches for each group
    for (const match of bracketData.matches) {
      if (!match.player1 || !match.player2) {
        console.log("Skipping match with missing player(s)");
        continue;
      }

      const groupId = match.groupId || "default";
      const bracketId = groupBrackets[groupId];

      if (!bracketId) {
        console.warn(`No bracket found for group ${groupId}, skipping match`);
        continue;
      }

      // IMPORTANT: Properly determine match status based on if it has a winner or is a draw
      const isDraw = match.isDraw === true;
      const hasWinner = !isDraw && match.winnerId;
      const matchStatus = (hasWinner || isDraw) ? "COMPLETED" : "PENDING";

      console.log(`Creating match: ${match.player1.id} vs ${match.player2.id} in group ${groupId}`);
      console.log(`Match status: ${matchStatus}, Winner ID: ${match.winnerId || 'None'}, isDraw: ${isDraw}`);

      try {
        // Ensure the data we're saving is consistent
        const matchData = {
          bracketId,
          position: match.position,
          status: matchStatus,
          player1Id: match.player1.id,
          player2Id: match.player2.id,
          // For draws, winnerId should be null, otherwise use the provided winnerId
          winnerId: isDraw ? null : match.winnerId,
          score: match.score || (isDraw ? "Draw" : null),
          // Store round robin specific data in roundRobinData field
          roundRobinData: JSON.stringify({
            round: match.round,
            isDraw: isDraw,
            groupId: match.groupId,
            groupName: match.groupName
          }),
        };

        // If the match is completed, add a completion time
        if (matchStatus === "COMPLETED") {
          matchData.completedTime = new Date();
        }

        // Log the exact data we're trying to save
        console.log("Creating match with data:", JSON.stringify(matchData, null, 2));

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
        // Continue with other matches instead of failing completely
      }
    }

    // STEP 5: If a tournament winner is declared, update the tournament record
    // Only update if tournamentWinnerId is explicitly included in the request
    if (bracketData.tournamentWinnerId) {
      console.log(`Setting tournament winner to: ${bracketData.tournamentWinnerId}`);

      try {
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            winnerId: bracketData.tournamentWinnerId,
            status: "COMPLETED"
          }
        });

        // If there are winners to save, handle them
        if (bracketData.winners && bracketData.winners.length > 0) {
          console.log(`Saving ${bracketData.winners.length} tournament winners`);

          // First delete any existing winners
          await prisma.tournamentWinner.deleteMany({
            where: { tournamentId }
          });

          // Get the tournament prize pool information
          const tournamentInfo = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            select: { prizePool: true }
          });

          // Then create the new winners
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
      console.log("No tournament winner specified in request, skipping winner update");
    }

    // STEP 6: Get updated tournament with brackets
    const updatedTournament = await getUpdatedTournament(tournamentId);
    return formatTournamentResponse(updatedTournament);
  } catch (error) {
    console.error("Round Robin bracket save error:", error);
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

// Handler for elimination format brackets (Single or Double)
async function handleEliminationBracket(tournamentId, bracketData) {
  try {
    // Clear existing brackets and matches
    await prisma.match.deleteMany({
      where: {
        bracket: {
          tournamentId
        }
      },
    });

    await prisma.tournamentBracket.deleteMany({
      where: {
        tournamentId
      },
    });

    // Create new brackets and matches
    if (bracketData.rounds && bracketData.rounds.length > 0) {
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
            tournamentId,
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
    }

    // If a tournament winner is declared, update the tournament record
    if (bracketData.tournamentWinnerId) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          winnerId: bracketData.tournamentWinnerId,
          status: "COMPLETED"
        }
      });

      // If there are winners to save
      if (bracketData.winners && bracketData.winners.length > 0) {
        // Get tournament for prize pool
        const tournamentInfo = await prisma.tournament.findUnique({
          where: { id: tournamentId },
          select: { prizePool: true }
        });

        // Clear existing winners
        await prisma.tournamentWinner.deleteMany({
          where: { tournamentId }
        });

        // Create new winners
        for (const winner of bracketData.winners) {
          await prisma.tournamentWinner.create({
            data: {
              tournamentId,
              userId: winner.userId,
              position: winner.position,
              prizeMoney: calculatePrizeMoney(tournamentInfo.prizePool, winner.position)
            }
          });
        }
      }
    }

    // Get updated tournament with brackets
    const updatedTournament = await getUpdatedTournament(tournamentId);
    return formatTournamentResponse(updatedTournament);
  } catch (error) {
    console.error("Elimination bracket save error:", error);
    throw error;
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
    },
  });
}

// Helper function to format tournament response
function formatTournamentResponse(tournament) {
  // Flatten matches for easier consumption by frontend
  const matches = [];

  tournament.brackets.forEach(bracket => {
    bracket.matches.forEach(match => {
      // Parse roundRobinData if available
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
        winnerId: match.winnerId, // Include winnerId directly
        score: match.score,
        status: match.status,
        completedTime: match.completedTime,
        isDraw: roundRobinInfo.isDraw || false,
        groupId: roundRobinInfo.groupId,
        groupName: roundRobinInfo.groupName
      };

      // IMPORTANT: Make sure winner info is correctly set
      // If there's a winnerId but no winner object (could happen with eager loading issues),
      // make sure the isDraw and winnerId properties are consistent
      if (match.winnerId && !match.winner) {
        matchData.winner = null; // Clear any potential inconsistent data
        matchData.winnerId = match.winnerId; // Keep the ID
        matchData.isDraw = false; // If there's a winnerId, it's not a draw
      } else if (roundRobinInfo.isDraw) {
        // For draws, ensure winner and winnerId are null
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

  // Include formatSettings in the response for the frontend
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

// New GET handler for retrieving bracket data
export async function GET(request, context) {
  try {
    const { id } = context.params;

    // Get tournament with brackets and matches
    const tournament = await getUpdatedTournament(id);

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

    return formatTournamentResponse(tournament);
  } catch (error) {
    console.error("Bracket fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch bracket data", error: error.message },
      { status: 500 }
    );
  }
}