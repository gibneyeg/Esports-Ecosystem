import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    const { id } = context.params;
    const { winners } = await request.json();

    // Validate winners array
    if (!winners || !winners.length) {
      return NextResponse.json(
        { message: "At least one winner is required" },
        { status: 400 }
      );
    }

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
        winners: true,
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
        { message: "Only tournament creator can declare winners" },
        { status: 403 }
      );
    }

    // Start a transaction to update everything
    const result = await prisma.$transaction(async (prisma) => {
      // Clear any existing winners
      await prisma.tournamentWinner.deleteMany({
        where: { tournamentId: id },
      });

      // Create new winners and update their points
      for (const winner of winners) {
        // Calculate prize money based on position (50% for 1st, 30% for 2nd, 20% for 3rd)
        const prizePercentage = winner.position === 1 ? 0.5 : 
                               winner.position === 2 ? 0.3 : 
                               winner.position === 3 ? 0.2 : 0;
        
        const prizeMoney = tournament.prizePool * prizePercentage;

        await prisma.tournamentWinner.create({
          data: {
            tournamentId: id,
            userId: winner.userId,
            position: winner.position,
            prizeMoney: prizeMoney,
          },
        });

        // Award points based on position
        const points = winner.position === 1 ? 100 : 
                      winner.position === 2 ? 50 : 
                      winner.position === 3 ? 25 : 0;

        await prisma.user.update({
          where: { id: winner.userId },
          data: {
            points: {
              increment: points
            }
          }
        });
      }

      // Update tournament status
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

export async function GET(request, context) {
  try {
    const { id } = context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        winners: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                points: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
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

    return NextResponse.json({ winners: tournament.winners });
  } catch (error) {
    console.error("Fetch winners error:", error);
    return NextResponse.json(
      { message: "Failed to fetch winners", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
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
        { message: "Only tournament creator can remove winners" },
        { status: 403 }
      );
    }

    await prisma.tournamentWinner.deleteMany({
      where: { tournamentId: id },
    });

    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: {
        status: "IN_PROGRESS"  // Reset status to in progress
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
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ 
      tournament: updatedTournament,
      message: "Winners removed successfully"
    });
  } catch (error) {
    console.error("Remove winners error:", error);
    return NextResponse.json(
      { message: "Failed to remove winners", error: error.message },
      { status: 500 }
    );
  }
}