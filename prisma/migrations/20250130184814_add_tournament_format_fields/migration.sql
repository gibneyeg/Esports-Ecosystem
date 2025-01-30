/*
  Warnings:

  - You are about to drop the `Tournament` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Tournament" DROP CONSTRAINT "Tournament_userId_fkey";

-- DropForeignKey
ALTER TABLE "Tournament" DROP CONSTRAINT "Tournament_winnerId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentBracket" DROP CONSTRAINT "TournamentBracket_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentParticipant" DROP CONSTRAINT "TournamentParticipant_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentWinner" DROP CONSTRAINT "TournamentWinner_tournamentId_fkey";

-- DropTable
DROP TABLE "Tournament";

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationCloseDate" TIMESTAMP(3) NOT NULL,
    "prizePool" DOUBLE PRECISION NOT NULL,
    "maxPlayers" INTEGER NOT NULL,
    "game" TEXT NOT NULL,
    "status" "TournamentStatus" NOT NULL DEFAULT 'UPCOMING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "winnerId" TEXT,
    "format" TEXT NOT NULL,
    "seedingType" TEXT NOT NULL DEFAULT 'RANDOM',
    "rules" TEXT,
    "formatSettings" JSONB,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TournamentWinner" ADD CONSTRAINT "TournamentWinner_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentBracket" ADD CONSTRAINT "TournamentBracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
