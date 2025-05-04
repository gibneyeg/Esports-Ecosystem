import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { canEditTournament, canManageBrackets, getUserTournamentRole } from "../../../../../../lib/tournamentAccess";

export async function GET(request, context) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ message: "Authentication required" }, { status: 401 });
        }

        const params = await context.params;
        const tournamentId = params.id;

        // Check various permissions
        const canEdit = await canEditTournament(session.user.id, tournamentId);
        const canManage = await canManageBrackets(session.user.id, tournamentId);
        const role = await getUserTournamentRole(session.user.id, tournamentId);

        return NextResponse.json({
            canEdit,
            canManage,
            role,
            hasAccess: canEdit || canManage
        });
    } catch (error) {
        console.error("Error checking tournament access:", error);
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}