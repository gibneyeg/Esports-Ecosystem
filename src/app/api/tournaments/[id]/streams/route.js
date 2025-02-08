import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { validateStream, getStreamInfo } from "../../../../../../lib/twitch";

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

    // Extract channel name from Twitch URL
    const channelName = streamUrl.split('/').pop();
    
    try {
      // Validate the Twitch stream exists
      const streamInfo = await getStreamInfo(channelName);
      if (!streamInfo) {
        return NextResponse.json(
          { message: "Invalid Twitch channel" },
          { status: 400 }
        );
      }

      // Check if stream is live
      const isLive = await validateStream(channelName);

      // Create the stream
      const stream = await prisma.tournamentStream.create({
        data: {
          tournamentId: id,
          streamUrl,
          streamerName: streamerName || streamInfo.display_name,
          isOfficial,
          isLive,
        }
      });

      return NextResponse.json(stream);
    } catch (error) {
      return NextResponse.json(
        { message: "Failed to validate Twitch stream" },
        { status: 400 }
      );
    }
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

    // Update live status for all streams
    const updatedStreams = await Promise.all(
      streams.map(async (stream) => {
        const channelName = stream.streamUrl.split('/').pop();
        try {
          const isLive = await validateStream(channelName);
          if (isLive !== stream.isLive) {
            await prisma.tournamentStream.update({
              where: { id: stream.id },
              data: { isLive }
            });
            return { ...stream, isLive };
          }
        } catch (error) {
          console.error(`Error updating stream status for ${channelName}:`, error);
        }
        return stream;
      })
    );

    return NextResponse.json(updatedStreams);
  } catch (error) {
    console.error("Stream fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch streams" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { id } = context.params;

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: { createdBy: true }
    });

    if (!tournament) {
      return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
    }

    // Only allow deletion by tournament creator
    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creators can remove streams" },
        { status: 403 }
      );
    }

    await prisma.tournamentStream.deleteMany({
      where: { tournamentId: id }
    });

    return NextResponse.json({ message: "All streams removed successfully" });
  } catch (error) {
    console.error("Stream deletion error:", error);
    return NextResponse.json(
      { message: "Failed to remove streams" },
      { status: 500 }
    );
  }
}