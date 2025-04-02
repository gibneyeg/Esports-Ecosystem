import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma.js";

export async function GET(request, { params }) {
    try {
        const { userId } = params;
        const { searchParams } = new URL(request.url);
        const requesterId = searchParams.get('requesterId');

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Fetch basic user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                name: true,
                email: true,
                image: true,
                rank: true,
                points: true,
                createdAt: true,
                isProfilePrivate: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if profile is private and if requester is not the profile owner
        const isOwnProfile = requesterId === userId;
        const isProfilePrivate = user.isProfilePrivate;

        // Everyone can see basic user info
        const baseResponse = {
            id: user.id,
            username: user.username,
            name: user.name,
            image: user.image,
            rank: user.rank,
            points: user.points,
            createdAt: user.createdAt,
            isProfilePrivate,
        };

        if (isProfilePrivate && !isOwnProfile) {
            return NextResponse.json({
                ...baseResponse,
                isPrivate: true,
            });
        }

        // If public profile or owner viewing their own profile, include all details
        const participatedTournaments = await prisma.tournamentParticipant.findMany({
            where: { userId: userId },
            select: {
                tournament: {
                    select: {
                        id: true,
                        name: true,
                        game: true,
                        startDate: true,
                        endDate: true,
                        prizePool: true,
                        status: true,
                    },
                },
                joinedAt: true,
            },
            orderBy: { joinedAt: "desc" },
        });

        // Fetch tournaments this user has created
        const createdTournaments = await prisma.tournament.findMany({
            where: { userId: userId },
            select: {
                id: true,
                name: true,
                game: true,
                startDate: true,
                endDate: true,
                prizePool: true,
                status: true,
            },
            orderBy: { createdAt: "desc" },
        });

        // Fetch tournament wins/placements
        const tournamentWins = await prisma.tournamentWinner.findMany({
            where: { userId: userId },
            select: {
                id: true,
                tournamentId: true,
                position: true,
                prizeMoney: true,
                createdAt: true,
                tournament: {
                    select: {
                        id: true,
                        name: true,
                        game: true,
                        endDate: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });

        // Calculate tournament participation and results
        const tournaments = [
            ...participatedTournaments.map(pt => ({
                id: pt.tournament.id,
                name: pt.tournament.name,
                game: pt.tournament.game,
                startDate: pt.tournament.startDate,
                endDate: pt.tournament.endDate,
                status: pt.tournament.status,
                joinedAt: pt.joinedAt,
                playerPosition: tournamentWins.find(tw => tw.tournamentId === pt.tournament.id)?.position || null,
            })),
            ...createdTournaments
                .filter(ct => !participatedTournaments.some(pt => pt.tournament.id === ct.id))
                .map(ct => ({
                    id: ct.id,
                    name: ct.name,
                    game: ct.game,
                    startDate: ct.startDate,
                    endDate: ct.endDate,
                    status: ct.status,
                    isCreator: true,
                })),
        ];

        // Format tournament wins for easy display
        const formattedTournamentWins = tournamentWins.map(win => ({
            id: win.id,
            tournamentId: win.tournamentId,
            tournamentName: win.tournament.name,
            game: win.tournament.game,
            position: win.position,
            prizeMoney: win.prizeMoney,
            date: win.tournament.endDate,
        }));

        const totalWinnings = tournamentWins.reduce((sum, win) => sum + win.prizeMoney, 0);

        const recentResults = formattedTournamentWins.slice(0, 5);

        return NextResponse.json({
            ...baseResponse,
            tournaments,
            tournamentWins: formattedTournamentWins,
            totalWinnings,
            recentResults,
        });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        return NextResponse.json(
            { error: "Failed to fetch user profile" },
            { status: 500 }
        );
    }
}