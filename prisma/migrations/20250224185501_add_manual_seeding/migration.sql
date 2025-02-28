-- AlterTable
ALTER TABLE "TournamentParticipant" ADD COLUMN     "seedNumber" INTEGER;

-- AlterTable
ALTER TABLE "tournaments" ADD COLUMN     "hasManualSeeding" BOOLEAN NOT NULL DEFAULT false;
