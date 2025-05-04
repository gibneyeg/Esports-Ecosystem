import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

async function validateSession() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        throw new Error("Authentication required");
    }

    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
    });

    if (!user) {
        throw new Error("User not found");
    }

    return { ...session, user };
}

// Get all roles for a tournament
export async function GET(request, context) {
    try {
        const session = await validateSession();
        const params = await context.params;
        const tournamentId = params.id;

        // Check if user has access to view roles
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                roles: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                            }
                        },
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                username: true,
                            }
                        }
                    }
                }
            }
        });

        if (!tournament) {
            return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
        }

        // Only owner can view and manage roles
        if (tournament.userId !== session.user.id) {
            return NextResponse.json({ message: "Only tournament owner can manage roles" }, { status: 403 });
        }

        return NextResponse.json(tournament.roles);
    } catch (error) {
        console.error("Error fetching tournament roles:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// Create or update a tournament role
export async function POST(request, context) {
    try {
        const session = await validateSession();
        const params = await context.params;
        const tournamentId = params.id;
        const body = await request.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
        }

        if (!["ADMIN", "MODERATOR"].includes(role)) {
            return NextResponse.json({ message: "Invalid role" }, { status: 400 });
        }

        // Check if user owns this tournament
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });

        if (!tournament) {
            return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
        }

        if (tournament.userId !== session.user.id) {
            return NextResponse.json({ message: "Only tournament owner can manage roles" }, { status: 403 });
        }

        if (userId === session.user.id) {
            return NextResponse.json({ message: "Cannot assign role to tournament owner" }, { status: 400 });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!targetUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        // Create or update role
        const tournamentRole = await prisma.tournamentRole.upsert({
            where: {
                tournamentId_userId: {
                    tournamentId: tournamentId,
                    userId: userId,
                }
            },
            update: {
                role: role,
                createdById: session.user.id,
            },
            create: {
                tournamentId: tournamentId,
                userId: userId,
                role: role,
                createdById: session.user.id,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                    }
                }
            }
        });

        return NextResponse.json(tournamentRole);
    } catch (error) {
        console.error("Error creating tournament role:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// Delete a tournament role
export async function DELETE(request, context) {
    try {
        const session = await validateSession();
        const params = await context.params;
        const tournamentId = params.id;
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ message: "Missing userId parameter" }, { status: 400 });
        }

        // Check if user owns this tournament
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
        });

        if (!tournament) {
            return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
        }

        if (tournament.userId !== session.user.id) {
            return NextResponse.json({ message: "Only tournament owner can manage roles" }, { status: 403 });
        }

        // Delete the role
        await prisma.tournamentRole.delete({
            where: {
                tournamentId_userId: {
                    tournamentId: tournamentId,
                    userId: userId,
                }
            }
        });

        return NextResponse.json({ message: "Role deleted successfully" });
    } catch (error) {
        console.error("Error deleting tournament role:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}