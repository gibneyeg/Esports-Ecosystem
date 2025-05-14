import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../../lib/prisma";
import { authOptions } from "../../../../auth/[...nextauth]/route";

export async function GET(request, context) {
    try {
        const { id } = context.params;

        // Get tournament to check format and access rights
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                email: true,
                                image: true,
                                points: true
                            }
                        }
                    }
                },
                createdBy: true
            }
        });

        if (!tournament) {
            return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
        }

        if (tournament.format !== "SWISS") {
            return NextResponse.json({ message: "Tournament is not in Swiss format" }, { status: 400 });
        }

        // Get the existing Swiss bracket data
        const bracketData = await prisma.tournamentSwissBracket.findUnique({
            where: { tournamentId: id },
            include: {
                rounds: {
                    include: {
                        matches: true
                    },
                    orderBy: {
                        roundNumber: 'asc'
                    }
                }
            }
        });

        if (!bracketData) {
            return NextResponse.json({
                tournamentId: id,
                rounds: [],
                currentRound: 0,
                format: 'SWISS'
            });
        }

        // Format the response
        const response = {
            tournamentId: bracketData.tournamentId,
            rounds: bracketData.rounds,
            currentRound: bracketData.currentRound,
            format: 'SWISS'
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error("Error fetching Swiss bracket:", error);
        return NextResponse.json(
            { message: "Failed to fetch Swiss bracket", error: error.message },
            { status: 500 }
        );
    }
}

export async function POST(request, context) {
    try {
        const { id } = context.params;
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        // Get tournament to check ownership
        const tournament = await prisma.tournament.findUnique({
            where: { id },
            include: {
                createdBy: true
            }
        });

        if (!tournament) {
            return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
        }

        if (tournament.format !== "SWISS") {
            return NextResponse.json({ message: "Tournament is not in Swiss format" }, { status: 400 });
        }

        // Check if user is tournament owner
        if (tournament.createdBy.email !== session.user.email) {
            return NextResponse.json({ message: "Only tournament owner can update bracket" }, { status: 403 });
        }

        const requestData = await request.json();
        const { rounds, currentRound, winners, isTeamTournament } = requestData;

        if (!rounds) {
            return NextResponse.json({ message: "Rounds data is required" }, { status: 400 });
        }

        // Transaction to update bracket data and possibly winners
        await prisma.$transaction(async (tx) => {
            const existingBracket = await tx.tournamentSwissBracket.findUnique({
                where: { tournamentId: id }
            });

            if (existingBracket) {
                await tx.tournamentSwissBracket.update({
                    where: { tournamentId: id },
                    data: {
                        currentRound: currentRound || 0,
                        updatedAt: new Date()
                    }
                });

                // Delete existing rounds and matches to replace with new data
                await tx.tournamentSwissMatch.deleteMany({
                    where: {
                        round: {
                            bracketId: existingBracket.id
                        }
                    }
                });

                await tx.tournamentSwissRound.deleteMany({
                    where: {
                        bracketId: existingBracket.id
                    }
                });
            } else {
                // Create new bracket
                await tx.tournamentSwissBracket.create({
                    data: {
                        tournamentId: id,
                        currentRound: currentRound || 0
                    }
                });
            }

            // Get the bracket record 
            const bracket = await tx.tournamentSwissBracket.findUnique({
                where: { tournamentId: id }
            });

            for (let i = 0; i < rounds.length; i++) {
                const round = rounds[i];

                // Create round
                const createdRound = await tx.tournamentSwissRound.create({
                    data: {
                        bracketId: bracket.id,
                        roundNumber: i,
                    }
                });

                // Create matches for this round
                if (round.matches && round.matches.length > 0) {
                    for (let j = 0; j < round.matches.length; j++) {
                        const match = round.matches[j];

                        if (isTeamTournament) {
                            // Create match with nulls for player IDs and store team info in metadata
                            await tx.tournamentSwissMatch.create({
                                data: {
                                    roundId: createdRound.id,
                                    player1Id: null, // Set to null for team matches
                                    player2Id: null, // Set to null for team matches
                                    result: match.result,
                                    position: j,
                                    // Store metadata as JSON string
                                    metadata: JSON.stringify({
                                        isTeamMatch: true,
                                        team1Id: match.team1Id,
                                        team2Id: match.team2Id,
                                        team1Name: match.team1Name,
                                        team2Name: match.team2Name
                                    })
                                }
                            });
                        } else {
                            // For individual tournaments, use regular player IDs
                            await tx.tournamentSwissMatch.create({
                                data: {
                                    roundId: createdRound.id,
                                    player1Id: match.player1Id,
                                    player2Id: match.player2Id,
                                    result: match.result,
                                    position: j
                                }
                            });
                        }
                    }
                }
            }

            // Update winners if provided
            if (winners && winners.length > 0) {
                // For team tournaments, only update the tournament metadata
                if (isTeamTournament) {
                    console.log("Saving team winners to tournament metadata");

                    // Get current format settings
                    const formatSettings = tournament.formatSettings || {};

                    // Update tournament with winner metadata and status
                    await tx.tournament.update({
                        where: { id },
                        data: {
                            formatSettings: {
                                ...formatSettings,
                                teamWinners: winners.map(w => ({
                                    teamId: w.teamId,
                                    position: w.position,
                                    prizeMoney: w.prizeMoney || 0
                                }))
                            },
                            status: "COMPLETED"
                        }
                    });
                }
                // For individual tournaments, process winners normally
                else {
                    // Delete existing winners
                    await tx.tournamentWinner.deleteMany({
                        where: { tournamentId: id }
                    });

                    // Create new winners
                    for (const winner of winners) {
                        if (winner.userId) {
                            await tx.tournamentWinner.create({
                                data: {
                                    tournament: { connect: { id: id } },
                                    user: { connect: { id: winner.userId } },
                                    position: winner.position,
                                    prizeMoney: winner.prizeMoney || 0
                                }
                            });
                        }
                    }

                    // Update tournament status
                    await tx.tournament.update({
                        where: { id },
                        data: { status: "COMPLETED" }
                    });
                }
            }
        });

        return NextResponse.json({ success: true, message: "Swiss bracket saved successfully" });
    } catch (error) {
        console.error("Error saving Swiss bracket:", error);
        return NextResponse.json(
            { message: "Failed to save Swiss bracket", error: error.message },
            { status: 500 }
        );
    }
}