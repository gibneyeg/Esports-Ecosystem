import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

// app/api/tournaments/route.js
export async function POST(req) {
  try {
    const session = await validateSession();

    const formData = await req.formData();
    const name = formData.get("name");
    const description = formData.get("description");
    const startDate = formData.get("startDate");
    const endDate = formData.get("endDate");
    const registrationCloseDate = formData.get("registrationCloseDate");
    const prizePool = formData.get("prizePool");
    const maxPlayers = formData.get("maxPlayers");
    const game = formData.get("game");
    const format = formData.get("format");
    const seedingType = formData.get("seedingType");
    const rules = formData.get("rules");
    const numberOfRounds = formData.get("numberOfRounds");
    const groupSize = formData.get("groupSize");
    const image = formData.get("image");

    // Validate required fields
    if (!name || !description || !startDate || !endDate || !registrationCloseDate || !game || !format) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Parse and validate maxPlayers
    const parsedMaxPlayers = parseInt(maxPlayers || 10);
    if (parsedMaxPlayers < 3) {
      return NextResponse.json(
        { message: "Tournament must allow at least 3 participants" },
        { status: 400 }
      );
    }
    if (parsedMaxPlayers > 128) {
      return NextResponse.json(
        { message: "Tournament cannot exceed 128 participants" },
        { status: 400 }
      );
    }

    // Validate format
    const validFormats = ["SINGLE_ELIMINATION", "DOUBLE_ELIMINATION", "ROUND_ROBIN", "SWISS"];
    if (!validFormats.includes(format)) {
      return NextResponse.json({ message: "Invalid tournament format" }, { status: 400 });
    }

    // Validate seeding type
    const validSeedingTypes = ["RANDOM", "MANUAL", "SKILL_BASED"];
    if (seedingType && !validSeedingTypes.includes(seedingType)) {
      return NextResponse.json({ message: "Invalid seeding type" }, { status: 400 });
    }

    // Format-specific validations
    const formatSettings = {};
    if (format === "SWISS") {
      const parsedRounds = parseInt(numberOfRounds);
      if (!parsedRounds || parsedRounds < 3 || parsedRounds > 10) {
        return NextResponse.json(
          { message: "Swiss format requires 3-10 rounds" },
          { status: 400 }
        );
      }
      formatSettings.numberOfRounds = parsedRounds;
    }

    if (format === "ROUND_ROBIN") {
      const parsedGroupSize = parseInt(groupSize);
      if (!parsedGroupSize || parsedGroupSize < 3 || parsedGroupSize > 8) {
        return NextResponse.json(
          { message: "Round Robin groups must have 3-8 players" },
          { status: 400 }
        );
      }
      formatSettings.groupSize = parsedGroupSize;
    }

    // Validate dates
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(endDate);
    const registrationCloseDateTime = new Date(registrationCloseDate);

    if (registrationCloseDateTime >= startDateTime) {
      return NextResponse.json(
        { message: "Registration must close before tournament starts" },
        { status: 400 }
      );
    }

    if (startDateTime >= endDateTime) {
      return NextResponse.json(
        { message: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Handle image upload
    let imageUrl = null;
    if (image) {
      try {
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`;

        const uploadResponse = await cloudinary.uploader.upload(base64Image, {
          folder: "tournament_banners",
          upload_preset: "tournament_images",
        });

        imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json({ message: "Failed to upload image" }, { status: 500 });
      }
    }

    // Create tournament
    const tournament = await prisma.tournament.create({
      data: {
        name,
        description,
        startDate: startDateTime,
        endDate: endDateTime,
        registrationCloseDate: registrationCloseDateTime,
        prizePool: parseFloat(prizePool || 0),
        maxPlayers: parsedMaxPlayers,
        game,
        userId: session.user.id,
        status: "UPCOMING",
        imageUrl,
        format,
        seedingType: seedingType || "RANDOM",
        rules: rules || "",
        formatSettings,
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

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const where = {
      ...(searchParams.get("status") && { status: searchParams.get("status") }),
      ...(searchParams.get("game") && { game: searchParams.get("game") }),
      ...(searchParams.get("createdBy") && {
        userId: searchParams.get("createdBy"),
      }),
    };

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

    const enhancedTournaments = tournaments.map((tournament) => {
      const now = new Date();
      const startDate = new Date(tournament.startDate);
      const registrationCloseDate = new Date(tournament.registrationCloseDate);
      const isUpcoming = tournament.status === "UPCOMING" && startDate > now;

      return {
        ...tournament,
        participantCount: tournament.participants.length,
        isRegistrationOpen:
          isUpcoming &&
          tournament.participants.length < tournament.maxPlayers &&
          now < registrationCloseDate,
        formattedStartDate: startDate.toLocaleString(),
        formattedEndDate: new Date(tournament.endDate).toLocaleString(),
        formattedRegistrationCloseDate: registrationCloseDate.toLocaleString(),
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

export async function DELETE(req, context) {
  try {
    const tournamentId = context.params.id;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    if (tournament.userId !== user.id) {
      return NextResponse.json(
        { message: "You don't have permission to delete this tournament" },
        { status: 403 }
      );
    }

    // Delete image from Cloudinary if it exists
    if (tournament.imageUrl) {
      try {
        // Extract public_id from the Cloudinary URL
        const publicId = tournament.imageUrl
          .split('/')
          .slice(-2)
          .join('/')
          .split('.')[0];
        
        await cloudinary.uploader.destroy(publicId);
      } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
      }
    }

    // Delete tournament from database
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({
      success: true,
      message: "Tournament successfully deleted",
    });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}