// app/api/teams/[id]/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(request, context) {
    try {
        const { id } = context.params;

        const team = await prisma.team.findUnique({
            where: { id },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        image: true,
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
                                image: true,
                            }
                        }
                    },
                    orderBy: {
                        role: 'asc',
                    }
                }
            }
        });

        if (!team) {
            return NextResponse.json({ message: "Team not found" }, { status: 404 });
        }

        return NextResponse.json(team);
    } catch (error) {
        console.error("Team fetch error:", error);
        return NextResponse.json(
            { message: "Failed to fetch team", error: error.message },
            { status: 500 }
        );
    }
}