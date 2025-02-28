import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    const { id } = context.params;
    const { seededParticipants } = await request.json();

    // Validate seededParticipants
    if (!seededParticipants || !Array.isArray(seededParticipants) || seededParticipants.length === 0) {
      return NextResponse.json(
        { message: "Invalid seeding data provided" },
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
        participants: true,
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
        { message: "Only tournament creator can set seeding" },
        { status: 403 }
      );
    }

    // Verify tournament is in correct state
    if (tournament.status !== "UPCOMING") {
      return NextResponse.json(
        { message: "Seeding can only be set for upcoming tournaments" },
        { status: 400 }
      );
    }

    // Verify tournament uses manual seeding
    if (tournament.seedingType !== "MANUAL") {
      return NextResponse.json(
        { message: "This tournament does not use manual seeding" },
        { status: 400 }
      );
    }

    // Verify all participants exist in the tournament
    const participantIds = tournament.participants.map(p => p.id);
    for (const seeded of seededParticipants) {
      if (!participantIds.includes(seeded.participantId)) {
        return NextResponse.json(
          { message: `Participant ID ${seeded.participantId} is not in this tournament` },
          { status: 400 }
        );
      }
    }

    // Update seeding in transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Clear any existing seeding
      await prisma.tournamentParticipant.updateMany({
        where: { tournamentId: id },
        data: { seedNumber: null },
      });

      // Update with new seeding
      for (const seeded of seededParticipants) {
        await prisma.tournamentParticipant.update({
          where: { 
            id: seeded.participantId,
          },
          data: { 
            seedNumber: seeded.seedNumber,
          },
        });
      }

      // Update tournament to reflect manual seeding was set
      await prisma.tournament.update({
        where: { id },
        data: { 
          hasManualSeeding: true,
        },
      });

      // Return updated tournament
      return prisma.tournament.findUnique({
        where: { id },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
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
            orderBy: {
              seedNumber: 'asc',
            },
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Seeding error:", error);
    return NextResponse.json(
      { message: "Failed to save seeding", error: error.message },
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
          orderBy: {
            seedNumber: 'asc',
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

    return NextResponse.json({ 
      participants: tournament.participants,
      hasManualSeeding: tournament.hasManualSeeding || false
    });
  } catch (error) {
    console.error("Fetch seeding error:", error);
    return NextResponse.json(
      { message: "Failed to fetch seeding", error: error.message },
      { status: 500 }
    );
  }
}