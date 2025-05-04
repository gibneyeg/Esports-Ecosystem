import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../lib/prisma";
import { authOptions } from "../../auth/[...nextauth]/route";
import bcrypt from "bcrypt";

export async function POST(request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { username, email, currentPassword, newPassword } = await request.json();

        // Find the user
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { accounts: true }  // Changed from account to accounts
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Check if user signed up with OAuth (Google/Discord)
        const isOAuthUser = user.accounts && user.accounts.some(acc =>
            acc.provider === "google" || acc.provider === "discord"
        );

        // Prepare update data
        const updateData = {};

        // Update username if provided
        if (username !== undefined) {
            // Check if username is already taken by another user
            if (username !== user.username) {
                const existingUser = await prisma.user.findUnique({
                    where: { username },
                });

                if (existingUser && existingUser.id !== user.id) {
                    return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
                }

                updateData.username = username;
            }
        }

        // Update email if provided (only for non-OAuth users)
        if (email && email !== user.email) {
            if (isOAuthUser) {
                return NextResponse.json({
                    error: "Cannot change email for OAuth accounts"
                }, { status: 400 });
            }

            // Check if email is already taken
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });

            if (existingUser) {
                return NextResponse.json({ error: "Email is already taken" }, { status: 400 });
            }

            updateData.email = email;
        }

        // Update password if provided (only for non-OAuth users)
        if (currentPassword && newPassword) {
            if (isOAuthUser) {
                return NextResponse.json({
                    error: "Cannot change password for OAuth accounts"
                }, { status: 400 });
            }

            if (!user.password) {
                return NextResponse.json({
                    error: "No password set for this account"
                }, { status: 400 });
            }

            // Verify current password
            const isPasswordValid = await bcrypt.compare(currentPassword, user.password);

            if (!isPasswordValid) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            updateData.password = hashedPassword;
        }

        // Update user if there are changes
        if (Object.keys(updateData).length > 0) {
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: updateData,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    name: true,
                    image: true,
                    rank: true,
                    points: true,
                },
            });

            return NextResponse.json({
                message: "Profile updated successfully",
                ...updatedUser,
            });
        }

        return NextResponse.json({
            message: "No changes to update",
            ...user,
        });

    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}