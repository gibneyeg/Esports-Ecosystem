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
    // More efficient query with only necessary fields
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

    // Process users without database updates
    const processedUsers = users.map((user) => {
      const totalWinnings = user.tournamentWins.reduce((sum, win) => 
        sum + win.prizeMoney, 0
      );

      // Get most recent tournament result
      const recentTournament = user.tournaments
        .sort((a, b) => 
          new Date(b.tournament.endDate) - new Date(a.tournament.endDate)
        )[0];

      const recentResult = recentTournament 
        ? `${recentTournament.tournament.winner?.id === user.id ? '1st' : 'Participated'} - ${recentTournament.tournament.name}`
        : null;

      // Calculate rank without updating database
      const newRank = calculateRank(user.points);

      return {
        id: user.id,
        username: user.username,
        name: user.name,
        points: user.points,
        rank: newRank,
        totalWinnings,
        recentResult,
        tournaments: user.tournaments.map(t => t.tournament),
        tournamentWins: user.tournamentWins
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