import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: { participants: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check if registration is open
    if (tournament.status !== "UPCOMING") {
      return NextResponse.json(
        { message: "Tournament is not open for registration" },
        { status: 400 }
      );
    }

    // Check if tournament is full
    if (tournament.participants.length >= tournament.maxPlayers) {
      return NextResponse.json(
        { message: "Tournament is full" },
        { status: 400 }
      );
    }

    // Check if user is already registered
    const existingParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: params.id,
          userId: session.user.id,
        },
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { message: "Already registered for this tournament" },
        { status: 400 }
      );
    }

    // Register user for tournament
    const participant = await prisma.tournamentParticipant.create({
      data: {
        tournamentId: params.id,
        userId: session.user.id,
      },
      include: {
        tournament: true,
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
      { message: "Failed to register for tournament" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    await prisma.tournamentParticipant.delete({
      where: {
        tournamentId_userId: {
          tournamentId: params.id,
          userId: session.user.id,
        },
      },
    });

    return NextResponse.json({ message: "Successfully left tournament" });
  } catch (error) {
    console.error("Tournament leave error:", error);
    return NextResponse.json(
      { message: "Failed to leave tournament" },
      { status: 500 }
    );
  }
}
