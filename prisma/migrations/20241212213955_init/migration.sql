/*
  Warnings:

  - You are about to drop the column `image` on the `Tournament` table. All the data in the column will be lost.
  - Added the required column `registrationCloseDate` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Match" DROP CONSTRAINT "Match_bracketId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentBracket" DROP CONSTRAINT "TournamentBracket_tournamentId_fkey";

-- DropForeignKey
ALTER TABLE "TournamentParticipant" DROP CONSTRAINT "TournamentParticipant_tournamentId_fkey";

-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "image",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "registrationCloseDate" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentBracket" ADD CONSTRAINT "TournamentBracket_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_bracketId_fkey" FOREIGN KEY ("bracketId") REFERENCES "TournamentBracket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
