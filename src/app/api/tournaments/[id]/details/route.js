// app/api/tournament/[id]/winners/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

const calculateRank = (points) => {
  if (points >= 5000) return 'Grandmaster';
  if (points >= 4000) return 'Master';
  if (points >= 3000) return 'Diamond';
  if (points >= 2000) return 'Platinum';
  if (points >= 1000) return 'Gold';
  if (points >= 500) return 'Silver';
  return 'Bronze';
};

export async function POST(request, context) {
  try {
    const { id } = context.params;
    const { winners } = await request.json();

    if (!winners || !winners.length) {
      return NextResponse.json(
        { message: "At least one winner is required" },
        { status: 400 }
      );
    }

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
        winners: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creator can declare winners" },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      // Clear existing winners
      await prisma.tournamentWinner.deleteMany({
        where: { tournamentId: id },
      });

      // Process each winner
      for (const winner of winners) {
        const prizePercentage = winner.position === 1 ? 0.5 : 
                               winner.position === 2 ? 0.3 : 
                               winner.position === 3 ? 0.2 : 0;
        
        const prizeMoney = tournament.prizePool * prizePercentage;

        // Create tournament winner record
        await prisma.tournamentWinner.create({
          data: {
            tournamentId: id,
            userId: winner.userId,
            position: winner.position,
            prizeMoney: prizeMoney,
          },
        });

        // Calculate points based on position
        const points = winner.position === 1 ? 100 : 
                      winner.position === 2 ? 50 : 
                      winner.position === 3 ? 25 : 0;

        // Get current user points
        const currentUser = await prisma.user.findUnique({
          where: { id: winner.userId },
          select: { points: true }
        });

        const newTotalPoints = (currentUser?.points || 0) + points;
        const newRank = calculateRank(newTotalPoints);

        // Update user points and rank
        await prisma.user.update({
          where: { id: winner.userId },
          data: {
            points: newTotalPoints,
            rank: newRank
          }
        });
      }

      // Update tournament status and return updated data
      const updatedTournament = await prisma.tournament.update({
        where: { id },
        data: { 
          status: "COMPLETED"
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
            },
          },
          winners: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  points: true,
                  rank: true,
                },
              },
            },
            orderBy: {
              position: 'asc',
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
                },
              },
            },
          },
        },
      });

      return updatedTournament;
    });

    return NextResponse.json({ 
      tournament: result,
      message: "Winners declared successfully"
    });
  } catch (error) {
    console.error("Declare winners error:", error);
    return NextResponse.json(
      { message: "Failed to declare winners", error: error.message },
      { status: 500 }
    );
  }
}

// Keep existing GET and DELETE handlers the same
export { GET, DELETE } from './original-route';