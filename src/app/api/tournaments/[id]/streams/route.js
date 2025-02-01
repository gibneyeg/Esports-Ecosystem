import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { id } = context.params;
    const { streamUrl, streamerName, isOfficial } = await request.json();

    // Validate the tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { createdBy: true }
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    // Only allow tournament creator to add official streams
    if (isOfficial && tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creators can add official streams" },
        { status: 403 }
      );
    }

    // Create the stream
    const stream = await prisma.tournamentStream.create({
      data: {
        tournamentId: id,
        streamUrl,
        streamerName,
        isOfficial,
      }
    });

    return NextResponse.json(stream);
  } catch (error) {
    console.error("Stream creation error:", error);
    return NextResponse.json(
      { message: "Failed to add stream" },
      { status: 500 }
    );
  }
}

export async function GET(request, context) {
  try {
    const { id } = context.params;
   
    const streams = await prisma.tournamentStream.findMany({
      where: { tournamentId: id },
      orderBy: [
        { isOfficial: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json(streams);
  } catch (error) {
    console.error("Stream fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}