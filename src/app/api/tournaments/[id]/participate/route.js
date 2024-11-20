import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request, { params }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { message: "Tournament ID is required" },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if tournament exists and get participant count
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check if tournament is full
    if (tournament._count.participants >= tournament.maxPlayers) {
      return NextResponse.json(
        { message: "Tournament is full" },
        { status: 400 }
      );
    }

    // Check if already participating
    const existingParticipation = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId: id,
        userId: session.user.id,
      },
    });

    if (existingParticipation) {
      return NextResponse.json(
        { message: "Already participating in this tournament" },
        { status: 400 }
      );
    }

    // Create participation
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: id,
        userId: session.user.id,
      },
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
    });

    return NextResponse.json(participant);
  } catch (error) {
    console.error("Tournament participation error:", error);
    return NextResponse.json(
      { message: `Failed to join tournament: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { message: "Tournament ID is required" },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const participant = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId: id,
        userId: session.user.id,
      },
    });

    if (!participant) {
      return NextResponse.json(
        { message: "Not participating in this tournament" },
        { status: 404 }
      );
    }

    await prisma.tournamentParticipant.delete({
      where: {
        id: participant.id,
      },
    });

    return NextResponse.json({ message: "Successfully left tournament" });
  } catch (error) {
    console.error("Tournament leave error:", error);
    return NextResponse.json(
      { message: `Failed to leave tournament: ${error.message}` },
      { status: 500 }
    );
  }
}
