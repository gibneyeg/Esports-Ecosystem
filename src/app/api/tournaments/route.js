import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";

async function validateSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { email: session?.user?.email },
    });

    if (!user) {
      throw new Error("Authentication required");
    }
    return { ...session, user: { ...session.user, id: user.id } };
  }
  return session;
}

export async function POST(req) {
  try {
    // Validate session
    const session = await validateSession();

    // Parse request body
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

    // Validate dates
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    if (startDateTime >= endDateTime) {
      return NextResponse.json(
        { message: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        startDate: startDateTime,
        endDate: endDateTime,
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
    console.error("Tournament creation error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    if (error.message === "Authentication required") {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { message: `Failed to create tournament: ${error.message}` },
      { status: 500 }
    );
  }
}
export async function DELETE(req) {
  try {
    // Get tournament ID from URL
    const { searchParams } = new URL(req.url);
    const tournamentId = searchParams.get("id");

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    // Validate session
    const session = await validateSession();

    // Check if tournament exists and user has permission
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Verify the user is the creator
    if (tournament.userId !== session.user.id) {
      return NextResponse.json(
        { message: "You don't have permission to delete this tournament" },
        { status: 403 }
      );
    }

    // Delete the tournament
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({ message: "Tournament successfully deleted" });
  } catch (error) {
    console.error("Tournament deletion error:", error);

    if (error.message === "Authentication required") {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }

    return NextResponse.json(
      { message: "Failed to delete tournament" },
      { status: 500 }
    );
  }
}
export async function GET(req) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);

    // Build query filters
    const where = {
      ...(searchParams.get("status") && { status: searchParams.get("status") }),
      ...(searchParams.get("game") && { game: searchParams.get("game") }),
      ...(searchParams.get("createdBy") && {
        userId: searchParams.get("createdBy"),
      }),
    };

    // Fetch tournaments
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

    // Enhance tournament data
    const enhancedTournaments = tournaments.map((tournament) => {
      const now = new Date();
      const startDate = new Date(tournament.startDate);
      const isUpcoming = tournament.status === "UPCOMING" && startDate > now;

      return {
        ...tournament,
        participantCount: tournament.participants.length,
        isRegistrationOpen:
          isUpcoming && tournament.participants.length < tournament.maxPlayers,
        formattedStartDate: startDate.toLocaleString(),
        formattedEndDate: new Date(tournament.endDate).toLocaleString(),
      };
    });

    return NextResponse.json(enhancedTournaments);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch tournaments",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
