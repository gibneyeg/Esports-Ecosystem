import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import prisma from "../../../lib/prisma";
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

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;

    const updatedUser = await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        image: base64Image,
      },
    });

    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    return NextResponse.json({
      imageUrl: base64Image,
      message: "Profile picture updated successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to upload image",
      },
      {
        status: 500,
      }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
