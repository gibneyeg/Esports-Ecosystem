import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "../../../lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";

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

    // Create a unique filename using timestamp and original name
    const timestamp = Date.now();
    const fileName = `profile-${timestamp}-${file.name}`;

    // Convert the file to a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Define the path where images will be stored
    const imagePath = path.join(
      process.cwd(),
      "public",
      "img",
      "profiles",
      fileName
    );

    // Save the file
    await writeFile(imagePath, buffer);

    // The URL that will be stored in the database and used in the frontend
    const imageUrl = `/img/profiles/${fileName}`;

    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        image: imageUrl,
      },
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl: imageUrl,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
