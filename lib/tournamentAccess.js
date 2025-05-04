import prisma from "@/lib/prisma";

// Check if user has any admin access to tournament
export async function hasTournamentAccess(userId, tournamentId) {
    if (!userId || !tournamentId) return false;

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            roles: {
                where: {
                    userId: userId,
                    role: { in: ['ADMIN', 'MODERATOR'] }
                }
            }
        }
    });

    if (!tournament) return false;

    if (tournament.userId === userId) return true;

    // Check if user has any admin role
    return tournament.roles.length > 0;
}

// Check if user can edit tournament details
export async function canEditTournament(userId, tournamentId) {
    if (!userId || !tournamentId) return false;

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            roles: {
                where: {
                    userId: userId,
                    role: 'ADMIN'
                }
            }
        }
    });

    if (!tournament) return false;

    return tournament.userId === userId || tournament.roles.length > 0;
}

// Check if user can manage brackets
export async function canManageBrackets(userId, tournamentId) {
    if (!userId || !tournamentId) return false;

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            roles: {
                where: {
                    userId: userId,
                    role: { in: ['ADMIN', 'MODERATOR'] }
                }
            }
        }
    });

    if (!tournament) return false;

    return tournament.userId === userId || tournament.roles.length > 0;
}

// Get user's tournament role
export async function getUserTournamentRole(userId, tournamentId) {
    if (!userId || !tournamentId) return null;

    const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
            roles: {
                where: {
                    userId: userId
                }
            }
        }
    });

    if (!tournament) return null;

    if (tournament.userId === userId) return 'OWNER';

    return tournament.roles[0]?.role || null;
}