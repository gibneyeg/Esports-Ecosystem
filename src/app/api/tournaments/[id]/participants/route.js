import { NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function GET(request, context) {
  try {
    const { id } = context.params;

    // Get tournament with participants
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              }
            }
          },
          orderBy: {
            seedNumber: 'asc',
          }
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Transform to a simpler format for frontend
    const participants = tournament.participants.map(p => ({
      id: p.user.id,
      name: p.user.name || p.user.username || p.user.email?.split('@')[0] || 'Anonymous User',
      participantId: p.id,
      seedNumber: p.seedNumber
    }));

    return NextResponse.json({ participants });
  } catch (error) {
    console.error("Fetch participants error:", error);
    return NextResponse.json(
      { message: "Failed to fetch participants", error: error.message },
      { status: 500 }
    );
  }
}