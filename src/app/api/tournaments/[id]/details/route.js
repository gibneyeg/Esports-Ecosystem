// app/api/tournaments/[id]/details/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "../../../../../lib/prisma";
import { authOptions } from "../../../auth/[...nextauth]/route";
import fs from "fs/promises";
import path from "path";

async function deleteTournamentImage(imageUrl) {
  if (!imageUrl) return;
  try {
    const filename = imageUrl.split("/").pop();
    if (!filename) return;
    const imagePath = path.join(
      process.cwd(),
      "public",
      "uploads",
      "tournaments",
      filename
    );
    await fs.access(imagePath);
    await fs.unlink(imagePath);
  } catch (error) {
    console.error("Error deleting tournament image:", error);
  }
}

export async function GET(request, context) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const tournamentId = resolvedParams.id;

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            image: true,
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            points: true,
            image: true,
          },
        },
        winners: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                points: true,
                image: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                image: true,
              },
            },
          },
          orderBy: {
            joinedAt: "desc",
          },
        },
        // Add team participants for team tournaments
        teamParticipants: {
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
                  }
                }
              }
            }
          },
          orderBy: {
            joinedAt: "desc",
          }
        },
        featuredStreams: true,
        roles: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Initialize teamParticipants as empty array if undefined
    if (!tournament.teamParticipants) {
      tournament.teamParticipants = [];
    }

    // Check if it's a team tournament
    const isTeamTournament = tournament.formatSettings?.registrationType === "TEAM";

    // Add computed fields
    const enrichedTournament = {
      ...tournament,
      // Count participants based on tournament type
      participantCount: isTeamTournament
        ? tournament.teamParticipants.length
        : tournament.participants.length,
      isRegistrationOpen:
        (isTeamTournament
          ? tournament.teamParticipants.length < tournament.maxPlayers
          : tournament.participants.length < tournament.maxPlayers) &&
        tournament.status === "UPCOMING" &&
        new Date() < new Date(tournament.startDate),
      hasWinner: !!tournament.winner,
      isTeamTournament: isTeamTournament,
    };

    return NextResponse.json(enrichedTournament);
  } catch (error) {
    console.error("Tournament fetch error:", error);
    return NextResponse.json(
      { message: "Failed to fetch tournament details", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request, context) {
  try {
    const { id } = context.params;
    const { winners } = await request.json();

    if (!winners || !winners.length) {
      return NextResponse.json(
        { message: "At least one winner is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        createdBy: true,
        winners: true,
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament creator can declare winners" },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (prisma) => {
      await prisma.tournamentWinner.deleteMany({
        where: { tournamentId: id },
      });

      for (const winner of winners) {
        const prizePercentage = winner.position === 1 ? 0.5 :
          winner.position === 2 ? 0.3 :
            winner.position === 3 ? 0.2 : 0;

        const prizeMoney = tournament.prizePool * prizePercentage;

        await prisma.tournamentWinner.create({
          data: {
            tournamentId: id,
            userId: winner.userId,
            position: winner.position,
            prizeMoney: prizeMoney,
          },
        });

        const points = winner.position === 1 ? 100 :
          winner.position === 2 ? 50 :
            winner.position === 3 ? 25 : 0;

        const currentUser = await prisma.user.findUnique({
          where: { id: winner.userId },
          select: { points: true }
        });

        const newTotalPoints = (currentUser?.points || 0) + points;

        await prisma.user.update({
          where: { id: winner.userId },
          data: {
            points: newTotalPoints
          }
        });
      }

      const updatedTournament = await prisma.tournament.update({
        where: { id },
        data: {
          status: "COMPLETED"
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              image: true,
            },
          },
          winners: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  points: true,
                  image: true,
                },
              },
            },
            orderBy: {
              position: 'asc',
            },
          },
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  username: true,
                  image: true,
                },
              },
            },
          },
          // Include team participants in the response
          teamParticipants: {
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
                    }
                  }
                }
              }
            },
          },
          featuredStreams: true,
        },
      });

      // Initialize teamParticipants if needed
      if (!updatedTournament.teamParticipants) {
        updatedTournament.teamParticipants = [];
      }

      return updatedTournament;
    });

    return NextResponse.json({
      tournament: result,
      message: "Winners declared successfully"
    });
  } catch (error) {
    console.error("Declare winners error:", error);
    return NextResponse.json(
      { message: "Failed to declare winners", error: error.message },
      { status: 500 }
    );
  }
}


export async function DELETE(request, context) {
  try {
    const resolvedParams = await Promise.resolve(context.params);
    const tournamentId = resolvedParams.id;

    if (!tournamentId) {
      return NextResponse.json(
        { message: "Tournament ID is required" },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        createdBy: true,
        roles: {
          where: {
            user: { email: session.user.email }
          }
        }
      },
    });

    if (!tournament) {
      return NextResponse.json(
        { message: "Tournament not found" },
        { status: 404 }
      );
    }

    // Only allow owners to delete tournaments
    if (tournament.createdBy.email !== session.user.email) {
      return NextResponse.json(
        { message: "Only tournament owners can delete tournaments" },
        { status: 403 }
      );
    }

    if (tournament.imageUrl) {
      await deleteTournamentImage(tournament.imageUrl);
    }

    // Delete the tournament 
    await prisma.tournament.delete({
      where: { id: tournamentId },
    });

    return NextResponse.json({
      success: true,
      message: "Tournament and associated image successfully deleted",
    });
  } catch (error) {
    console.error("Tournament deletion error:", error);
    return NextResponse.json(
      { message: "Failed to delete tournament", error: error.message },
      { status: 500 }
    );
  }
}