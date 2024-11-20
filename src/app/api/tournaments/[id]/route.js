import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req, { params }) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
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
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    const enhancedTournament = {
      ...tournament,
      participantCount: tournament.participants.length,
      isRegistrationOpen:
        tournament.participants.length < tournament.maxPlayers &&
        tournament.status === "UPCOMING" &&
        new Date() < tournament.startDate,
    };

    return NextResponse.json(enhancedTournament);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tournament" },
      { status: 500 }
    );
  }
}

// Add update tournament functionality
export async function PUT(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Not authorized to update this tournament" },
        { status: 403 }
      );
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id: params.id },
      data: body,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Tournament update error:", error);
    return NextResponse.json(
      { message: "Failed to update tournament" },
      { status: 500 }
    );
  }
}

// Add delete tournament functionality
export async function DELETE(req, { params }) {
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
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Not authorized to delete this tournament" },
        { status: 403 }
      );
    }

    await prisma.tournament.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Tournament deleted successfully" });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json(
      { message: "Failed to delete tournament" },
      { status: 500 }
    );
  }
}
