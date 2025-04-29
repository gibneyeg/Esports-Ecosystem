import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

export async function GET(req) {
    try {
        // Get session with authOptions
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json(
                { message: "Authentication required" },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(req.url);
        const query = searchParams.get("query");

        if (!query || query.length < 3) {
            return NextResponse.json(
                { message: "Search query must be at least 3 characters" },
                { status: 400 }
            );
        }

        // Search for users with query matching username, name, or email
        // Don't include the current user in results
        const users = await prisma.user.findMany({
            where: {
                AND: [
                    {
                        OR: [
                            {
                                username: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                            {
                                name: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                            {
                                email: {
                                    contains: query,
                                    mode: "insensitive",
                                },
                            },
                        ],
                    },
                    {
                        // Exclude the current user
                        NOT: {
                            email: session.user.email,
                        },
                    },

                ],
            },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                image: true,
                rank: true,
            },
            take: 10, // Limit results to 10 users
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("User search error:", error);
        return NextResponse.json(
            { message: `Failed to search users: ${error.message}` },
            { status: 500 }
        );
    }
}