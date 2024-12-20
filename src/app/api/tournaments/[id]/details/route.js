import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import fs from "fs/promises";
import path from "path";

async function deleteTournamentImage(imageUrl) {
  if (!imageUrl) return;

  try {
    const filename = imageUrl.split("/").pop();
    if (!filename) return;

    const imagePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "tournaments",
      filename
    );

    // Check if file exists before attempting to delete
    await fs.access(imagePath);
    await fs.unlink(imagePath);

    console.log(`Successfully deleted image: ${filename}`);
  } catch (error) {
    console.error("Error deleting tournament image:", error);
  }
}

export async function GET(request, context) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const tournamentId = resolvedParams.id;

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
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
          orderBy: {
            joinedAt: "desc",
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

    // Add computed fields
    const enrichedTournament = {
      ...tournament,
      participantCount: tournament.participants.length,
      isRegistrationOpen:
        tournament.participants.length < tournament.maxPlayers &&
        tournament.status === "UPCOMING" &&
        new Date() < new Date(tournament.startDate),
    };

    return NextResponse.json(enrichedTournament);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tournament details", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const tournamentId = resolvedParams.id;

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    // First check if tournament exists and get creator info
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
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

    // Delete the tournament image if it exists
    if (tournament.imageUrl) {
      await deleteTournamentImage(tournament.imageUrl);
    }

    // Delete the tournament and all related data
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({
      success: true,
      message: "Tournament and associated image successfully deleted",
    });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json(
      { message: "Failed to delete tournament", error: error.message },
      { status: 500 }
    );
  }
}
