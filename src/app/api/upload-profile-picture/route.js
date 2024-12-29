import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "../../../lib/prisma";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("image");

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Convert file to buffer and then to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = buffer.toString('base64');
    const base64Image = `data:${file.type};base64,${base64String}`;

    // Log upload attempt
    console.log('Attempting upload with preset:', 'profile_pictures');
    console.log('Cloud name:', process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);

    // Upload to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      upload_preset: "profile_pictures",
      resource_type: "image",
    });

    console.log('Upload successful:', uploadResponse.secure_url);

    // Update user profile in database
    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        image: uploadResponse.secure_url,
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: uploadResponse.secure_url,
      message: "Profile picture updated successfully"
    });

  } catch (error) {
    console.error("Detailed upload error:", {
      message: error.message,
      code: error.http_code,
      stack: error.stack
    });
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}