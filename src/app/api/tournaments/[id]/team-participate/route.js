import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";

export async function POST(request, context) {
    try {
        // Get session with authOptions
        const session = await getServerSession(authOptions);

        // If no session, return unauthorized
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Authentication required" },
                { status: 401 }
            );
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ message: "User not found" }, { status: 401 });
        }

        const params = await Promise.resolve(context.params);
        const tournamentId = params.id;

        // Get the request body
        const body = await request.json();
        const { teamId } = body;

        if (!teamId) {
            return NextResponse.json(
                { message: "Team ID is required" },
                { status: 400 }
            );
        }

        // Check if tournament exists
        const tournament = await prisma.tournament.findUnique({
            where: { id: tournamentId },
            include: {
                teamParticipants: true,
            },
        });

        if (!tournament) {
            return NextResponse.json(
                { message: "Tournament not found" },
                { status: 404 }
            );
        }

        // Verify the tournament is team-based
        if (tournament.formatSettings?.registrationType !== "TEAM") {
            return NextResponse.json(
                { message: "This tournament does not accept team registrations" },
                { status: 400 }
            );
        }

        // Check if registration is open
        const now = new Date();
        const registrationCloseDate = new Date(tournament.registrationCloseDate);

        if (now > registrationCloseDate && !tournament.formatSettings?.teamsCanRegisterAfterStart) {
            return NextResponse.json(
                { message: "Registration for this tournament has closed" },
                { status: 400 }
            );
        }

        // Check if tournament is full
        if (tournament.teamParticipants.length >= tournament.maxPlayers) {
            return NextResponse.json(
                { message: "Tournament is full" },
                { status: 400 }
            );
        }

        // Check if team already participating
        const existingTeamParticipant = await prisma.teamTournamentParticipant.findFirst({
            where: {
                tournamentId,
                teamId,
            },
        });

        if (existingTeamParticipant) {
            return NextResponse.json(
                { message: "Team is already registered for this tournament" },
                { status: 400 }
            );
        }

        // Get the team and verify the user is the owner/authorized to register
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: {
                members: {
                    include: {
                        user: true,
                    },
                },
            },
        });

        if (!team) {
            return NextResponse.json(
                { message: "Team not found" },
                { status: 404 }
            );
        }

        // Check if the user is the team owner or has admin rights
        const userMembership = team.members.find(member => member.userId === user.id);

        if (!userMembership || (userMembership.role !== "OWNER" && userMembership.role !== "ADMIN")) {
            return NextResponse.json(
                { message: "You don't have permission to register this team for tournaments" },
                { status: 403 }
            );
        }

        // Validate team size requirements
        const requiredTeamSize = tournament.formatSettings?.teamSize || 2;
        const allowPartialTeams = tournament.formatSettings?.allowPartialTeams || false;

        if (team.members.length < requiredTeamSize && !allowPartialTeams) {
            return NextResponse.json(
                { message: `Team must have at least ${requiredTeamSize} members to participate` },
                { status: 400 }
            );
        }

        // Create the team participant
        const teamParticipant = await prisma.teamTournamentParticipant.create({
            data: {
                tournament: {
                    connect: { id: tournamentId },
                },
                team: {
                    connect: { id: teamId },
                },
            },
        });

        // Return the updated tournament data with participants
        const updatedTournament = await prisma.tournament.findUnique({
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
                },
                teamParticipants: {
                    include: {
                        team: {
                            include: {
                                owner: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        email: true,
                                    }
                                },
                                members: {
                                    include: {
                                        user: {
                                            select: {
                                                id: true,
                                                name: true,
                                                username: true,
                                                email: true,
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
        });

        return NextResponse.json(updatedTournament);
    } catch (error) {
        console.error("Team tournament registration error:", error);
        return NextResponse.json(
            { message: `Failed to register team: ${error.message}` },
            { status: 500 }
        );
    }
}