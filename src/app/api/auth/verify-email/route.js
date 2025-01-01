// app/api/auth/verify-email/route.js
import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma.js";
import nodemailer from "nodemailer";
import crypto from "crypto";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function POST(request) {
  try {
    const { email } = await request.json();
    
    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Store verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });
    
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_SERVER_USER,
      to: email,
      subject: "Verify your email address",
      html: `
        <h1>Email Verification</h1>
        <p>Please click the link below to verify your email address:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      `,
    });
    
    return NextResponse.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Email sending error:", error);
    return NextResponse.json(
      { error: "Error sending verification email" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
   
    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // First check if the user is already verified
    const existingToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!existingToken) {
      // Check if the user was already verified with this token
      return NextResponse.json({
        message: "Email already verified",
        alreadyVerified: true
      });
    }
   
    // Find token and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find user
      const user = await tx.user.findUnique({
        where: { email: existingToken.identifier }
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Check if already verified
      if (user.emailVerified) {
        // Clean up token and return success
        await tx.verificationToken.delete({
          where: { token }
        });
        return user;
      }

      if (existingToken.expires < new Date()) {
        // Delete expired token
        await tx.verificationToken.delete({
          where: { token }
        });
        throw new Error("Token expired");
      }

      // Update user's email verification status
      const updatedUser = await tx.user.update({
        where: { email: existingToken.identifier },
        data: { emailVerified: new Date() }
      });

      // Delete used token
      await tx.verificationToken.delete({
        where: { token }
      });

      return updatedUser;
    });

    // Remove sensitive data
    const { password: _, ...userWithoutPassword } = result;
    
    return NextResponse.json({
      message: "Email verified successfully",
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error("Email verification error:", error);
   
    const errorMessage = error.message || "Error verifying email";
    const status =
      errorMessage === "Invalid token" ||
      errorMessage === "Token expired" ||
      errorMessage === "Email already verified" ? 400 : 500;

    return NextResponse.json(
      { error: errorMessage },
      { status }
    );
  }
}