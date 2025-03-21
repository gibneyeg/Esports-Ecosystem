import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../../lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function POST(request, context) {
    try {
        const { id } = context.params;
        const data = await request.json();

        // Check if we have matches data
        if (!data.matches || !Array.isArray(data.matches)) {
            return NextResponse.json(
                { message: "Valid matches array is required" },
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
                bracket: true
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
                { message: "Only tournament creator can update the bracket" },
                { status: 403 }
            );
        }

        // Start a transaction to update everything
        const result = await prisma.$transaction(async (prisma) => {
            // Update bracket data
            await prisma.tournamentBracket.upsert({
                where: {
                    tournamentId: id
                },
                update: {
                    matches: data.matches,
                    tournamentWinnerId: data.tournamentWinnerId || null
                },
                create: {
                    tournamentId: id,
                    matches: data.matches,
                    tournamentWinnerId: data.tournamentWinnerId || null
                }
            });

            // Process winners if provided
            if (data.winners && Array.isArray(data.winners)) {
                // Clear any existing winners
                await prisma.tournamentWinner.deleteMany({
                    where: { tournamentId: id },
                });

                // Create new winners 
                for (const winner of data.winners) {
                    if (!winner.userId || typeof winner.position !== 'number') {
                        continue; // Skip invalid entries
                    }

                    // Calculate prize money based on position (if tournament has a prize pool)
                    let prizeMoney = 0;
                    if (tournament.prizePool) {
                        const prizePercentage = winner.position === 1 ? 0.5 :
                            winner.position === 2 ? 0.3 :
                                winner.position === 3 ? 0.2 : 0;
                        prizeMoney = tournament.prizePool * prizePercentage;
                    }

                    await prisma.tournamentWinner.create({
                        data: {
                            tournamentId: id,
                            userId: winner.userId,
                            position: winner.position,
                            prizeMoney: prizeMoney,
                        },
                    });

                    // Award points based on position
                    const points = winner.position === 1 ? 100 :
                        winner.position === 2 ? 50 :
                            winner.position === 3 ? 25 : 0;

                    if (points > 0) {
                        await prisma.user.update({
                            where: { id: winner.userId },
                            data: {
                                points: {
                                    increment: points
                                }
                            }
                        });
                    }
                }
            }

            // Update tournament status if we have a first place winner
            if (data.winners && data.winners.some(w => w.position === 1)) {
                await prisma.tournament.update({
                    where: { id },
                    data: {
                        status: "COMPLETED"
                    }
                });
            }

            // Return updated tournament data
            return await prisma.tournament.findUnique({
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
                    winners: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    username: true,
                                    points: true,
                                },
                            },
                        },
                        orderBy: {
                            position: 'asc',
                        },
                    }
                }
            });
        });

        return NextResponse.json({
            message: "Bracket updated successfully",
            tournament: result
        });
    } catch (error) {
        console.error("Update bracket error:", error);
        return NextResponse.json(
            { message: "Failed to update bracket", error: error.message },
            { status: 500 }
        );
    }
}

// GET endpoint to retrieve the bracket with extended data for third place
export async function GET(request, context) {
    try {
        const { id } = context.params;

        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                bracket: true,
                winners: {
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
                        position: 'asc',
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

        return NextResponse.json({
            bracket: tournament.bracket,
            winners: tournament.winners
        });
    } catch (error) {
        console.error("Fetch bracket error:", error);
        return NextResponse.json(
            { message: "Failed to fetch bracket", error: error.message },
            { status: 500 }
        );
    }
}