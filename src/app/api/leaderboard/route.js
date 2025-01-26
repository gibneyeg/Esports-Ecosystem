// app/api/leaderboard/route.js
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
    // Fetch users with their tournament-related data
    const users = await prisma.user.findMany({
      include: {
        tournamentWins: {
          include: {
            tournament: {
              select: {
                name: true,
                game: true,
                prizePool: true,
                endDate: true
              }
            }
          }
        },
        tournaments: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                status: true,
                endDate: true,
                winner: {
                  select: {
                    id: true,
                    username: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Process user data and calculate ranks
    const processedUsers = await Promise.all(users.map(async (user) => {
      const totalWinnings = user.tournamentWins.reduce((sum, win) => 
        sum + win.prizeMoney, 0
      );

      // Get most recent tournament result
      const recentTournament = user.tournaments
        .filter(t => t.tournament.status === 'COMPLETED')
        .sort((a, b) => 
          new Date(b.tournament.endDate) - new Date(a.tournament.endDate)
        )[0];

      const recentResult = recentTournament 
        ? `${recentTournament.tournament.winner?.id === user.id ? '1st' : 'Participated'} - ${recentTournament.tournament.name}`
        : null;

      // Calculate new rank based on points
      const newRank = calculateRank(user.points);

      // Update user's rank in database if it's different
      if (newRank !== user.rank) {
        await prisma.user.update({
          where: { id: user.id },
          data: { rank: newRank }
        });
      }

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
    }));

    return NextResponse.json({
      users: processedUsers,
      ranks: ['All', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master', 'Grandmaster']
    });
  } catch (error) {
    console.error("Error fetching leaderboard data:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    );
  }
}