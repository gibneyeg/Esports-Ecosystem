import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    const { id, matchId } = context.params;
    const { playerId, position } = await request.json();
    
    // Validate input
    if (!playerId || (position !== "player1" && position !== "player2")) {
      return NextResponse.json(
        { message: "Invalid input: playerId and position (player1 or player2) are required" },
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
        { message: "Only tournament creator can assign players to matches" },
        { status: 403 }
      );
    }
    
    // Get the match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        bracket: true,
      }
    });
    
    if (!match) {
      return NextResponse.json(
        { message: "Match not found" },
        { status: 404 }
      );
    }
    
    // Verify the match belongs to the tournament
    if (match.bracket.tournamentId !== id) {
      return NextResponse.json(
        { message: "Match does not belong to this tournament" },
        { status: 400 }
      );
    }
    
    // Verify the player is a participant in the tournament
    const participant = await prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId: id,
        userId: playerId,
      },
    });
    
    if (!participant) {
      return NextResponse.json(
        { message: "Player is not a tournament participant" },
        { status: 400 }
      );
    }
    
    // Update the match
    const updateData = {};
    if (position === "player1") {
      updateData.player1Id = playerId;
    } else {
      updateData.player2Id = playerId;
    }
    
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        player1: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        },
        player2: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        },
      }
    });
    
    return NextResponse.json({
      message: "Player assigned successfully",
      match: {
        id: updatedMatch.id,
        round: match.bracket.round,
        position: match.position,
        player1: updatedMatch.player1,
        player2: updatedMatch.player2,
        status: updatedMatch.status,
      }
    });
  } catch (error) {
    console.error("Match assignment error:", error);
    return NextResponse.json(
      { message: "Failed to assign player to match", error: error.message },
      { status: 500 }
    );
  }
}

// Handle removal of player from match
export async function DELETE(request, context) {
  try {
    const { id, matchId } = context.params;
    const { position } = await request.json();
    
    // Validate input
    if (position !== "player1" && position !== "player2") {
      return NextResponse.json(
        { message: "Invalid input: position (player1 or player2) is required" },
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
        { message: "Only tournament creator can modify matches" },
        { status: 403 }
      );
    }
    
    // Get the match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        bracket: true,
      }
    });
    
    if (!match) {
      return NextResponse.json(
        { message: "Match not found" },
        { status: 404 }
      );
    }
    
    // Verify the match belongs to the tournament
    if (match.bracket.tournamentId !== id) {
      return NextResponse.json(
        { message: "Match does not belong to this tournament" },
        { status: 400 }
      );
    }
    
    // Update the match
    const updateData = {};
    if (position === "player1") {
      updateData.player1Id = null;
    } else {
      updateData.player2Id = null;
    }
    
    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
      include: {
        player1: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        },
        player2: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          }
        },
      }
    });
    
    return NextResponse.json({
      message: "Player removed successfully",
      match: {
        id: updatedMatch.id,
        round: match.bracket.round,
        position: match.position,
        player1: updatedMatch.player1,
        player2: updatedMatch.player2,
        status: updatedMatch.status,
      }
    });
  } catch (error) {
    console.error("Match modification error:", error);
    return NextResponse.json(
      { message: "Failed to remove player from match", error: error.message },
      { status: 500 }
    );
  }
}