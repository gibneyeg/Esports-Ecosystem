import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request, { params }) {
  const id = params?.id; // No need to await params.id in Next.js 14
  if (!id) {
    return NextResponse.json(
      { message: "Tournament ID is required" },
      { status: 400 }
    );
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id },
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

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tournament);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tournament" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { message: "Tournament ID is required" },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Not authorized to update this tournament" },
        { status: 403 }
      );
    }

    const updatedTournament = await prisma.tournament.update({
      where: { id },
      data: body,
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

    return NextResponse.json(updatedTournament);
  } catch (error) {
    console.error("Tournament update error:", error);
    return NextResponse.json(
      { message: `Failed to update tournament: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json(
      { message: "Tournament ID is required" },
      { status: 400 }
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.userId !== session.user.id) {
      return NextResponse.json(
        { message: "Not authorized to delete this tournament" },
        { status: 403 }
      );
    }

    await prisma.tournament.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Tournament deleted successfully" });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json(
      { message: `Failed to delete tournament: ${error.message}` },
      { status: 500 }
    );
  }
}
