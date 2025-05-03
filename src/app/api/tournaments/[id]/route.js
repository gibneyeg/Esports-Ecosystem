import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { v2 as cloudinary } from 'cloudinary';

if (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export async function POST(request, context) {
  try {
    // Get session with authOptions
    const session = await getServerSession(authOptions);
    // If no session, try to find user by email
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    const params = await context.params;
    const tournamentId = params.id;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Check if already participating
    const existingParticipant = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId: tournamentId,
        userId: user.id,
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { message: "Already participating in this tournament" },
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

    // Create participant
    await prisma.tournamentParticipant.create({
      data: {
        tournament: {
          connect: { id: tournamentId },
        },
        user: {
          connect: { id: user.id },
        },
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

    // Return the updated tournament data
    const updatedTournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
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

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Tournament participation error:", error);
    return NextResponse.json(
      { message: `Failed to join tournament: ${error.message}` },
      { status: 500 }
    );
  }
}

// updating tournament
export async function PUT(request, context) {
  try {
    // Get session with authOptions
    const session = await getServerSession(authOptions);

    // If no session, try to find user by email
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    const params = await context.params;
    const tournamentId = params.id;


    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: { select: { id: true } },
        teamParticipants: { select: { id: true } },
        brackets: { select: { id: true } },
        swissBracket: { select: { id: true } }
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { message: "You don't have permission to edit this tournament" },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    // Basic tournament data that can always be updated
    const updateData = {
      name: formData.get("name"),
      description: formData.get("description"),
      startDate: new Date(formData.get("startDate")),
      endDate: new Date(formData.get("endDate")),
      registrationCloseDate: new Date(formData.get("registrationCloseDate")),
      prizePool: parseFloat(formData.get("prizePool")),
      rules: formData.get("rules") || "",
      streamEmbed: formData.get("streamEmbed") === "true",
      streamUrl: formData.get("streamUrl") || null,
    };

    // Handle fields that can't be changed if there are participants
    const hasParticipants = tournament.participants.length > 0 || tournament.teamParticipants.length > 0;
    const hasBracket = tournament.brackets.length > 0 || tournament.swissBracket !== null;

    if (!hasParticipants) {
      updateData.maxPlayers = parseInt(formData.get("maxPlayers"), 10);
      updateData.game = formData.get("game");
      updateData.format = formData.get("format");

      // Format settings
      const formatSettings = {};

      formatSettings.registrationType = formData.get("registrationType") || "INDIVIDUAL";

      // Team-specific settings, if applicable
      if (formatSettings.registrationType === "TEAM") {
        formatSettings.teamSize = parseInt(formData.get("teamSize"), 10) || 2;
        formatSettings.allowPartialTeams = formData.get("allowPartialTeams") === "true";
        formatSettings.teamsCanRegisterAfterStart = formData.get("teamsCanRegisterAfterStart") === "true";
        formatSettings.requireTeamApproval = formData.get("requireTeamApproval") === "true";
      }

      // Format-specific settings
      if (formData.get("numberOfRounds")) {
        formatSettings.numberOfRounds = parseInt(formData.get("numberOfRounds"), 10);
      }

      if (formData.get("groupSize")) {
        formatSettings.groupSize = parseInt(formData.get("groupSize"), 10);
      }

      updateData.formatSettings = formatSettings;
    }

    // Can only change seeding type if no bracket has been created
    if (!hasBracket) {
      updateData.seedingType = formData.get("seedingType") || "RANDOM";
    }

    // Handle image upload
    const image = formData.get("image");
    if (image && image instanceof Blob) {
      try {
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const base64Image = `data:${image.type};base64,${buffer.toString('base64')}`;

        const uploadResponse = await cloudinary.uploader.upload(base64Image, {
          folder: "tournament_images",
          upload_preset: "tournament_images",
        });

        updateData.imageUrl = uploadResponse.secure_url;
      } catch (error) {
        console.error("Image upload error:", error);
        return NextResponse.json(
          { message: "Failed to upload image" },
          { status: 500 }
        );
      }
    } else if (formData.get("deleteImage") === "true") {
      updateData.imageUrl = null;
    }

    // Update the tournament
    const updatedTournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
              }
            }
          }
        },
        teamParticipants: {
          include: {
            team: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        image: true,
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Tournament update error:", error);
    return NextResponse.json(
      { message: `Failed to update tournament: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    // Get session with authOptions
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 401 });
    }

    const params = await context.params;
    const tournamentId = params.id;

    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
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

    // Verify the user is the creator
    if (tournament.userId !== user.id) {
      return NextResponse.json(
        { message: "You don't have permission to delete this tournament" },
        { status: 403 }
      );
    }

    // Delete the tournament
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({
      message: "Tournament successfully deleted",
      success: true,
    });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json(
      { message: `Failed to delete tournament: ${error.message}` },
      { status: 500 }
    );
  }
}