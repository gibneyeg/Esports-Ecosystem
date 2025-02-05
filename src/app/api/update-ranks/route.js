import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

const calculateRank = (points) => {
  if (points >= 5000) return 'Grandmaster';
  if (points >= 4000) return 'Master';
  if (points >= 3000) return 'Diamond';
  if (points >= 2000) return 'Platinum';
  if (points >= 1000) return 'Gold';
  if (points >= 500) return 'Silver';
  return 'Bronze';
};

export async function POST() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        points: true,
        rank: true,
        username: true
      }
    });

    const updates = [];
    for (const user of users) {
      const newRank = calculateRank(user.points);
      if (newRank !== user.rank) {
        updates.push(
          prisma.user.update({
            where: { id: user.id },
            data: { rank: newRank }
          })
        );
      }
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    return NextResponse.json({ 
      success: true, 
      updatedCount: updates.length 
    });
  } catch (error) {
    console.error("Error updating ranks:", error);
    return NextResponse.json(
      { error: "Failed to update ranks" },
      { status: 500 }
    );
  }
}