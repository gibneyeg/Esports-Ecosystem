import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function PUT(request, context) {
  try {
    const { id } = context.params;
    const { status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { message: "Tournament ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: { status },
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
    console.error("Error updating tournament status:", error);
    return NextResponse.json(
      { message: "Failed to update tournament status", error: error.message },
      { status: 500 }
    );
  }
}

// update tournament status
export async function updateTournamentStatus(tournament) {
  const now = new Date();
  const startDate = new Date(tournament.startDate);
  const endDate = new Date(tournament.endDate);
  let newStatus;

  if (endDate < now) {
    newStatus = "COMPLETED";
  } else if (now >= startDate && now <= endDate) {
    newStatus = "ONGOING";
  } else {
    newStatus = "UPCOMING";
  }

  if (newStatus !== tournament.status) {
    const response = await fetch(`/api/tournaments/${tournament.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      throw new Error('Failed to update tournament status');
    }

    return await response.json();
  }

  return tournament;
}