import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary 
cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

export async function PUT(request, context) {
    try {
        const { id } = context.params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Authentication required" }, { status: 401 });
        }

        const team = await prisma.team.findUnique({
            where: { id },
            select: {
                ownerId: true,
                logoUrl: true
            }
        });

        if (!team) {
            return NextResponse.json({ message: "Team not found" }, { status: 404 });
        }

        // Check if the current user is the team owner
        if (team.ownerId !== session.user.id) {
            return NextResponse.json({ message: "Only the team owner can edit the team" }, { status: 403 });
        }

        const formData = await request.formData();
        const name = formData.get("name");
        const tag = formData.get("tag");
        const description = formData.get("description");
        const logo = formData.get("logo");
        const removeLogo = formData.get("removeLogo") === 'true';

        if (!name || !tag) {
            return NextResponse.json({ message: "Team name and tag are required" }, { status: 400 });
        }

        if (tag.length < 2 || tag.length > 5) {
            return NextResponse.json(
                { message: "Team tag must be between 2-5 characters" },
                { status: 400 }
            );
        }

        // Check if tag is already taken by another team
        const existingTeam = await prisma.team.findFirst({
            where: {
                tag,
                id: { not: id }
            },
        });

        if (existingTeam) {
            return NextResponse.json(
                { message: "Team tag is already in use by another team" },
                { status: 400 }
            );
        }

        // Handle logo upload if provided
        let logoUrl = team.logoUrl;

        // If remove logo is true, set logoUrl to null
        if (removeLogo) {
            logoUrl = null;
        }
        // Otherwise, if there's a new logo, upload it
        else if (logo && logo.size > 0) {
            try {
                const bytes = await logo.arrayBuffer();
                const buffer = Buffer.from(bytes);
                const base64Image = `data:${logo.type};base64,${buffer.toString('base64')}`;

                // Upload without using the upload_preset
                const uploadResponse = await cloudinary.uploader.upload(base64Image, {
                    folder: "team_logos",
                    // Remove the upload_preset parameter
                });

                logoUrl = uploadResponse.secure_url;
            } catch (error) {
                console.error("Logo upload error:", error);
                return NextResponse.json({ message: `Failed to upload logo: ${error.message}` }, { status: 500 });
            }
        }

        // Update the team
        const updatedTeam = await prisma.team.update({
            where: { id },
            data: {
                name,
                tag,
                description: description || "",
                logoUrl,
            },
        });

        return NextResponse.json(updatedTeam);
    } catch (error) {
        console.error("Team update error:", error);
        return NextResponse.json(
            { message: `Failed to update team: ${error.message}` },
            { status: 500 }
        );
    }
}

export async function DELETE(request, context) {
    try {
        const { id } = context.params;

        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ message: "Authentication required" }, { status: 401 });
        }

        const team = await prisma.team.findUnique({
            where: { id },
            include: {
                members: true
            }
        });

        if (!team) {
            return NextResponse.json({ message: "Team not found" }, { status: 404 });
        }

        if (team.ownerId !== session.user.id) {
            return NextResponse.json({ message: "Only the team owner can delete the team" }, { status: 403 });
        }

        // Delete all related records in transaction
        await prisma.$transaction(async (tx) => {
            await tx.teamInvitation.deleteMany({
                where: { teamId: id }
            });

            await tx.teamTournamentParticipant.deleteMany({
                where: { teamId: id }
            });

            await tx.teamMember.deleteMany({
                where: { teamId: id }
            });

            await tx.team.delete({
                where: { id }
            });
        });

        return NextResponse.json({ success: true, message: "Team deleted successfully" });
    } catch (error) {
        console.error("Team deletion error:", error);
        return NextResponse.json(
            { message: `Failed to delete team: ${error.message}` },
            { status: 500 }
        );
    }
}