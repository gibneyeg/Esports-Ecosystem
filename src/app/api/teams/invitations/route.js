import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";

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

// Get all invitations for current user
export async function GET(req) {
    try {
        const session = await validateSession();

        const invitations = await prisma.teamInvitation.findMany({
            where: {
                userId: session.user.id,
                status: "PENDING"
            },
            include: {
                team: {
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
                        _count: {
                            select: {
                                members: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        return NextResponse.json(invitations);
    } catch (error) {
        console.error("Error fetching invitations:", error);

        if (error.message === "Authentication required" || error.message === "User not found") {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }

        return NextResponse.json(
            { message: "Failed to fetch invitations", error: error.message },
            { status: 500 }
        );
    }
}

// Handle responding to an invitation
export async function POST(req) {
    try {
        const session = await validateSession();
        const { invitationId, action } = await req.json();

        if (!invitationId || !action || (action !== "ACCEPT" && action !== "DECLINE")) {
            return NextResponse.json(
                { message: "Invalid request. Must include invitationId and action (ACCEPT or DECLINE)" },
                { status: 400 }
            );
        }

        const invitation = await prisma.teamInvitation.findFirst({
            where: {
                id: invitationId,
                userId: session.user.id,
                status: "PENDING"
            },
            include: {
                team: true
            }
        });

        if (!invitation) {
            return NextResponse.json(
                { message: "Invitation not found or already processed" },
                { status: 404 }
            );
        }

        if (action === "ACCEPT") {
            const existingMembership = await prisma.teamMember.findFirst({
                where: {
                    teamId: invitation.teamId,
                    userId: session.user.id
                }
            });

            if (existingMembership) {
                await prisma.teamInvitation.update({
                    where: { id: invitationId },
                    data: { status: "ACCEPTED" }
                });

                return NextResponse.json({
                    success: true,
                    message: "You are already a member of this team",
                    team: invitation.team
                });
            }

            // Add user as team member and update invitation status
            await prisma.$transaction([
                prisma.teamMember.create({
                    data: {
                        role: "MEMBER",
                        team: {
                            connect: { id: invitation.teamId }
                        },
                        user: {
                            connect: { id: session.user.id }
                        }
                    }
                }),
                prisma.teamInvitation.update({
                    where: { id: invitationId },
                    data: { status: "ACCEPTED" }
                })
            ]);

            // Return team details
            const team = await prisma.team.findUnique({
                where: { id: invitation.teamId },
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
                                    email: true,
                                    image: true
                                }
                            }
                        }
                    }
                }
            });

            return NextResponse.json({
                success: true,
                message: "Invitation accepted. You are now a member of this team.",
                team
            });
        } else {
            await prisma.teamInvitation.update({
                where: { id: invitationId },
                data: { status: "DECLINED" }
            });

            return NextResponse.json({
                success: true,
                message: "Invitation declined"
            });
        }
    } catch (error) {
        console.error("Error processing invitation:", error);

        if (error.message === "Authentication required" || error.message === "User not found") {
            return NextResponse.json({ message: error.message }, { status: 401 });
        }

        return NextResponse.json(
            { message: "Failed to process invitation", error: error.message },
            { status: 500 }
        );
    }
}