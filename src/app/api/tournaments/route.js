import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { unlink } from "fs/promises";
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

// Helper function to generate a unique filename
function generateUniqueFilename(originalName) {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop();
  return `${timestamp}-${randomString}.${extension}`;
}

export async function POST(req) {
  try {
    const session = await validateSession();

    const formData = await req.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const prizePool = formData.get("prizePool");
    const maxPlayers = formData.get("maxPlayers");
    const game = formData.get("game");
    const image = formData.get("image");

    if (!name || !description || !startDate || !endDate || !game) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    if (startDateTime >= endDateTime) {
      return NextResponse.json(
        { message: "End date must be after start date" },
        { status: 400 }
      );
    }

    let imageUrl = null;
    if (image) {
      try {
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadsDir = join(process.cwd(), "public", "uploads");
        try {
          await mkdir(uploadsDir, { recursive: true });
        } catch (err) {
          if (err.code !== "EEXIST") throw err;
        }

        const filename = generateUniqueFilename(image.name);
        const imagePath = join(uploadsDir, filename);
        await writeFile(imagePath, buffer);
        imageUrl = `/uploads/${filename}`;
      } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json(
          { message: "Failed to upload image" },
          { status: 500 }
        );
      }
    }

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
        imageUrl,
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
    console.error("Tournament creation error:", error);
    if (error.message === "Authentication required") {
      return NextResponse.json({ message: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { message: `Failed to create tournament: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const tournamentId = context.params.id;

    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get the actual user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    // Get tournament
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check ownership
    if (tournament.userId !== user.id) {
      return NextResponse.json(
        { message: "You don't have permission to delete this tournament" },
        { status: 403 }
      );
    }

    // With cascading deletes set up, we can directly delete the tournament
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    // Delete the image file if it exists
    if (tournament.imageUrl) {
      try {
        const imagePath = join(process.cwd(), "public", tournament.imageUrl);
        await unlink(imagePath).catch(console.error);
      } catch (error) {
        console.error("Error deleting image file:", error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Tournament successfully deleted",
    });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
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
