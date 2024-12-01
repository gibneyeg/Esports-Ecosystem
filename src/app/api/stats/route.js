import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const totalPlayers = await prisma.user.count();

    const totalTournaments = await prisma.tournament.count({
      where: {
        status: {
          in: ["UPCOMING", "ONGOING"],
        },
      },
    });

    const prizePools = await prisma.tournament.aggregate({
      _sum: {
        prizePool: true,
      },
      where: {
        status: {
          in: ["UPCOMING", "ONGOING"],
        },
      },
    });

    const totalPrizePool = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(prizePools._sum.prizePool || 0);

    return Response.json({
      totalPrizePool,
      totalPlayers: totalPlayers.toLocaleString(),
      totalTournaments: totalTournaments.toLocaleString(),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
