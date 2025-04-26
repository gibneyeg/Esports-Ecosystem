import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../lib/prisma";
import { authOptions } from "../auth/[...nextauth]/route";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

export async function POST(req) {
    try {
        const session = await validateSession();
        const formData = await req.formData();

        // Extract team data
        const name = formData.get("name");
        const tag = formData.get("tag");
        const description = formData.get("description");
        const logo = formData.get("logo");
        const invitedUsersJson = formData.get("invitedUsers");

        // Validate required fields
        if (!name || !tag) {
            return NextResponse.json({ message: "Team name and tag are required" }, { status: 400 });
        }

        // Validate tag length (2-5 characters)
        if (tag.length < 2 || tag.length > 5) {
            return NextResponse.json(
                { message: "Team tag must be between 2-5 characters" },
                { status: 400 }
            );
        }

        // Check if tag is already taken
        const existingTeam = await prisma.team.findUnique({
            where: { tag },
        });

        if (existingTeam) {
            return NextResponse.json(
                { message: "Team tag is already in use" },
                { status: 400 }
            );
        }

        // Handle logo upload if provided
        let logoUrl = null;
        if (logo) {
            try {
                const bytes = await logo.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const base64Image = `data:${logo.type};base64,${buffer.toString('base64')}`;

                const uploadResponse = await cloudinary.uploader.upload(base64Image, {
                    folder: "team_logos",
                    upload_preset: "team_images",
                });

                logoUrl = uploadResponse.secure_url;
            } catch (error) {
                console.error("Logo upload error:", error);
                return NextResponse.json({ message: "Failed to upload logo" }, { status: 500 });
            }
        }

        // Parse invited users
        let invitedUserIds = [];
        if (invitedUsersJson) {
            try {
                invitedUserIds = JSON.parse(invitedUsersJson);
            } catch (error) {
                console.error("Error parsing invited users:", error);
                return NextResponse.json(
                    { message: "Invalid invited users format" },
                    { status: 400 }
                );
            }
        }

        // Create transaction to handle team creation and member invitations
        const result = await prisma.$transaction(async (tx) => {
            // Create the team
            const team = await tx.team.create({
                data: {
                    name,
                    tag,
                    description: description || "",
                    logoUrl,
                    owner: {
                        connect: { id: session.user.id }
                    }
                },
            });

            // Add owner as team member with OWNER role
            await tx.teamMember.create({
                data: {
                    role: "OWNER",
                    team: {
                        connect: { id: team.id }
                    },
                    user: {
                        connect: { id: session.user.id }
                    }
                }
            });

            // Add invited members with MEMBER role
            if (invitedUserIds.length > 0) {
                // Verify all invited users exist
                const invitedUsers = await tx.user.findMany({
                    where: {
                        id: {
                            in: invitedUserIds
                        }
                    },
                    select: {
                        id: true
                    }
                });

                const validUserIds = invitedUsers.map(user => user.id);

                // Create team membership for each valid user
                await Promise.all(
                    validUserIds.map(userId =>
                        tx.teamMember.create({
                            data: {
                                role: "MEMBER",
                                team: {
                                    connect: { id: team.id }
                                },
                                user: {
                                    connect: { id: userId }
                                }
                            }
                        })
                    )
                );
            }

            return team;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Team creation error:", error);

        if (error.message === "Authentication required" || error.message === "User not found") {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }

        return NextResponse.json(
            { message: `Failed to create team: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function GET(req) {
    try {
        const session = await validateSession();
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get("userId");

        // If userId is provided, fetch teams for that user
        if (userId) {
            // Verify the user has permission to view these teams
            if (userId !== session.user.id && !session.user.isAdmin) {
                // Check if the profile is public
                const targetUser = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { isProfilePrivate: true }
                });

                if (targetUser?.isProfilePrivate) {
                    return NextResponse.json({ message: "User profile is private" }, { status: 403 });
                }
            }

            const teams = await prisma.team.findMany({
                where: {
                    members: {
                        some: {
                            userId
                        }
                    }
                },
                include: {
                    owner: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    },
                    members: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    username: true,
                                    image: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            tournaments: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            });

            return NextResponse.json(teams);
        }

        // Otherwise, fetch all teams (could add pagination later)
        const teams = await prisma.team.findMany({
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                },
                _count: {
                    select: {
                        members: true,
                        tournaments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50  // Limit results
        });

        return NextResponse.json(teams);
    } catch (error) {
        console.error("Team fetch error:", error);

        if (error.message === "Authentication required" || error.message === "User not found") {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }

        return NextResponse.json(
            { message: "Failed to fetch teams" },
            { status: 500 }
        );
    }
}