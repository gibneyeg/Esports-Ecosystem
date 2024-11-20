import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "/home/catheater/esports-ecosystem/src/lib/prisma.js";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Try to find user by email as fallback
      const user = await prisma.user.findUnique({
        where: { email: session?.user?.email },
      });

      if (!user) {
        return NextResponse.json(
          { message: "Authentication required" },
          { status: 401 }
        );
      }
      // Add user ID to session
      session.user.id = user.id;
    }

    const body = await req.json();

    const {
      name,
      description,
      startDate,
      endDate,
      prizePool,
      maxPlayers,
      game,
    } = body;

    // Validate required fields
    if (!name || !description || !startDate || !endDate || !game) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        prizePool: parseFloat(prizePool || 0),
        maxPlayers: parseInt(maxPlayers || 10),
        game,
        userId: session.user.id,
        status: "UPCOMING",
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
      },
    });

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Tournament creation error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { message: `Failed to create tournament: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const game = searchParams.get("game");
    const createdBy = searchParams.get("createdBy");

    const where = {};
    if (status) where.status = status;
    if (game) where.game = game;
    if (createdBy) where.userId = createdBy;

    const tournaments = await prisma.tournament.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const enhancedTournaments = tournaments.map((tournament) => ({
      ...tournament,
      participantCount: tournament.participants.length,
      isRegistrationOpen:
        tournament.participants.length < tournament.maxPlayers &&
        tournament.status === "UPCOMING" &&
        new Date() < tournament.startDate,
    }));

    return NextResponse.json(enhancedTournaments);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tournaments" },
      { status: 500 }
    );
  }
}
