import { PrismaClient } from "@prisma/client";
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export const revalidate = 60;

// Cache the database result
let cachedStats = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000;

async function getStats() {
  const now = Date.now();

  if (cachedStats && (now - cacheTimestamp < CACHE_DURATION)) {
    return cachedStats;
  }

  try {
    // Combine all queries into a single transaction
    const [playersCount, tournamentStats] = await prisma.$transaction([
      prisma.user.count(),
      prisma.tournament.aggregate({
        _count: true,
        _sum: {
          prizePool: true,
        },
        where: {
          status: {
            in: ["UPCOMING", "ONGOING"],
          },
        },
      })
    ]);

    const stats = {
      totalPrizePool: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(tournamentStats._sum.prizePool || 0),
      totalPlayers: playersCount.toLocaleString(),
      totalTournaments: tournamentStats._count.toLocaleString(),
    };

    // Update cache
    cachedStats = stats;
    cacheTimestamp = now;

    return stats;
  } catch (error) {
    console.error("Error fetching stats:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const stats = await getStats();

    // Add cache control headers
    const headers = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30'
    };

    return NextResponse.json(stats, { headers });
  } catch (error) {
    console.error("Error in stats route:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  } finally {

  }
}