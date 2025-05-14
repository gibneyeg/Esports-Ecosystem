
import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

const calculateRank = (points) => {
  if (points >= 5000) return 'Grandmaster';
  if (points >= 4000) return 'Master';
  if (points >= 3000) return 'Diamond';
  if (points >= 2000) return 'Platinum';
  if (points >= 1000) return 'Gold';
  if (points >= 500) return 'Silver';
  return 'Bronze';
};

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        points: true,
        rank: true,
        tournamentWins: {
          select: {
            prizeMoney: true,
            tournament: {
              select: {
                name: true,
              }
            }
          }
        },
        tournaments: {
          where: {
            tournament: {
              status: 'COMPLETED'
            }
          },
          select: {
            tournament: {
              select: {
                id: true,
                name: true,
                status: true,
                endDate: true,
                winner: {
                  select: {
                    id: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Quietly check/update ranks for any users who need it
    const updates = [];
    let updatedUsers = [...users];

    for (const user of users) {
      const correctRank = calculateRank(user.points);
      if (correctRank !== user.rank) {
        updates.push(
          prisma.user.update({
            where: { id: user.id },
            data: { rank: correctRank }
          })
        );

        // Update the copy that will be returned
        updatedUsers = updatedUsers.map(u =>
          u.id === user.id ? { ...u, rank: correctRank } : u
        );
      }
    }

    //  Perform the update if needed 
    if (updates.length > 0) {
      try {
        await prisma.$transaction(updates);
        console.log(`Silently updated ${updates.length} user ranks`);
      } catch (updateError) {
        // If update fails, just log it - don't interrupt the response
        console.error("Rank update error:", updateError);
      }
    }

    const processedUsers = updatedUsers.map((user) => {
      const totalWinnings = user.tournamentWins.reduce((sum, win) =>
        sum + win.prizeMoney, 0
      );

      const recentTournament = user.tournaments
        .sort((a, b) =>
          new Date(b.tournament.endDate) - new Date(a.tournament.endDate)
        )[0];

      const recentResult = recentTournament
        ? `${recentTournament.tournament.winner?.id === user.id ? '1st' : 'Participated'} - ${recentTournament.tournament.name}`
        : null;

      const recentTournamentId = recentTournament?.tournament?.id || null;

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        points: user.points,
        rank: user.rank,
        totalWinnings,
        recentResult,
        recentTournamentId,
        tournamentWins: user.tournamentWins,
        tournamentsCount: user.tournaments.length
      };
    });

    return NextResponse.json({
      users: processedUsers,
      ranks: ['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster']
    });

  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data", details: error.message },
      { status: 500 }
    );
  }
}