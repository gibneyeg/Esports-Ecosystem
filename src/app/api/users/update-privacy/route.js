import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma.js";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { isProfilePrivate } = await request.json();

        // Update user's privacy setting
        const updatedUser = await prisma.user.update({
            where: { id: session.user.id },
            data: { isProfilePrivate },
        });

        return NextResponse.json({
            success: true,
            isProfilePrivate: updatedUser.isProfilePrivate
        });
    } catch (error) {
        console.error("Error updating privacy setting:", error);
        return NextResponse.json(
            { error: "Failed to update privacy setting" },
            { status: 500 }
        );
    }
}