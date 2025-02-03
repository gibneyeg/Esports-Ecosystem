import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";

const mockRoute = {
  POST: async (request, context) => {
    try {
      const session = await getServerSession();
      if (!session?.user?.email) {
        return NextResponse.json({ message: "Authentication required" }, { status: 401 });
      }

      const { id } = context.params;
      const { streamUrl, streamerName, isOfficial } = await request.json();

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { createdBy: true }
      });

      if (!tournament) {
        return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
      }

      if (isOfficial && tournament.createdBy.email !== session.user.email) {
        return NextResponse.json(
          { message: "Only tournament creators can add official streams" },
          { status: 403 }
        );
      }

      const stream = await prisma.tournamentStream.create({
        data: {
          tournamentId: id,
          streamUrl,
          streamerName,
          isOfficial,
        }
      });

      return NextResponse.json(stream);
    } catch (error) {
      return NextResponse.json(
        { message: "Failed to add stream" },
        { status: 500 }
      );
    }
  },

  GET: async (request, context) => {
    try {
      const { id } = context.params;
      
      const streams = await prisma.tournamentStream.findMany({
        where: { tournamentId: id },
        orderBy: [
          { isOfficial: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return NextResponse.json(streams);
    } catch (error) {
      return NextResponse.json(
        { message: "Failed to fetch streams" },
        { status: 500 }
      );
    }
  },

  DELETE: async (request, context) => {
    try {
      const session = await getServerSession();
      if (!session?.user?.email) {
        return NextResponse.json({ message: "Authentication required" }, { status: 401 });
      }

      const { id, streamId } = context.params;

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { createdBy: true }
      });

      if (!tournament) {
        return NextResponse.json({ message: "Tournament not found" }, { status: 404 });
      }

      const stream = await prisma.tournamentStream.findUnique({
        where: { id: streamId }
      });

      if (!stream) {
        return NextResponse.json({ message: "Stream not found" }, { status: 404 });
      }

      if (tournament.createdBy.email !== session.user.email) {
        return NextResponse.json(
          { message: "Only tournament creators can remove streams" },
          { status: 403 }
        );
      }

      await prisma.tournamentStream.delete({
        where: { id: streamId }
      });

      return NextResponse.json({ message: "Stream removed successfully" });
    } catch (error) {
      return NextResponse.json(
        { message: "Failed to remove stream" },
        { status: 500 }
      );
    }
  }
};

vi.mock("next-auth", () => ({
  getServerSession: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  default: {
    tournament: {
      findUnique: vi.fn(),
    },
    tournamentStream: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn()
    }
  }
}));

describe("Tournament Stream Routes", () => {
  const mockSession = {
    user: {
      email: "creator@test.com",
      id: "creator-id"
    }
  };

  const mockTournament = {
    id: "tournament-id",
    createdBy: {
      email: "creator@test.com"
    }
  };

  const mockContext = {
    params: {
      id: "tournament-id",
      streamId: "stream-id"
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/tournaments/[id]/streams", () => {
    const mockStreamData = {
      streamUrl: "https://twitch.tv/test",
      streamerName: "TestStreamer",
      isOfficial: true
    };

    it("returns 401 if user is not authenticated", async () => {
      getServerSession.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "POST",
        body: JSON.stringify(mockStreamData)
      });

      const response = await mockRoute.POST(request, mockContext);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        message: "Authentication required"
      });
    });

    it("returns 404 if tournament is not found", async () => {
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "POST",
        body: JSON.stringify(mockStreamData)
      });

      const response = await mockRoute.POST(request, mockContext);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        message: "Tournament not found"
      });
    });

    it("returns 403 if non-creator tries to add official stream", async () => {
      getServerSession.mockResolvedValueOnce({
        user: { email: "other@test.com" }
      });
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "POST",
        body: JSON.stringify(mockStreamData)
      });

      const response = await mockRoute.POST(request, mockContext);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        message: "Only tournament creators can add official streams"
      });
    });

    it("successfully creates a stream", async () => {
      const mockStream = { id: "stream-id", ...mockStreamData };
      
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);
      prisma.tournamentStream.create.mockResolvedValueOnce(mockStream);

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "POST",
        body: JSON.stringify(mockStreamData)
      });

      const response = await mockRoute.POST(request, mockContext);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual(mockStream);
      expect(prisma.tournamentStream.create).toHaveBeenCalledWith({
        data: {
          tournamentId: mockContext.params.id,
          ...mockStreamData
        }
      });
    });

    it("handles database errors during stream creation", async () => {
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);
      prisma.tournamentStream.create.mockRejectedValueOnce(new Error("Database error"));

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "POST",
        body: JSON.stringify(mockStreamData)
      });

      const response = await mockRoute.POST(request, mockContext);
      
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Failed to add stream"
      });
    });
  });

  describe("GET /api/tournaments/[id]/streams", () => {
    it("successfully retrieves streams", async () => {
      const mockStreams = [
        { id: "stream-1", streamUrl: "https://twitch.tv/test1" },
        { id: "stream-2", streamUrl: "https://twitch.tv/test2" }
      ];

      prisma.tournamentStream.findMany.mockResolvedValueOnce(mockStreams);

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "GET"
      });

      const response = await mockRoute.GET(request, mockContext);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual(mockStreams);
      expect(prisma.tournamentStream.findMany).toHaveBeenCalledWith({
        where: { tournamentId: mockContext.params.id },
        orderBy: [
          { isOfficial: 'desc' },
          { createdAt: 'desc' }
        ]
      });
    });

    it("handles errors when retrieving streams", async () => {
      prisma.tournamentStream.findMany.mockRejectedValueOnce(new Error("Database error"));

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "GET"
      });

      const response = await mockRoute.GET(request, mockContext);
      
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Failed to fetch streams"
      });
    });

    it("returns empty array when no streams exist", async () => {
      prisma.tournamentStream.findMany.mockResolvedValueOnce([]);

      const request = new Request("http://localhost/api/tournaments/123/streams", {
        method: "GET"
      });

      const response = await mockRoute.GET(request, mockContext);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("DELETE /api/tournaments/[id]/streams/[streamId]", () => {
    it("returns 401 if user is not authenticated", async () => {
      getServerSession.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/tournaments/123/streams/456", {
        method: "DELETE"
      });

      const response = await mockRoute.DELETE(request, mockContext);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        message: "Authentication required"
      });
    });

    it("returns 404 if tournament is not found", async () => {
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/tournaments/123/streams/456", {
        method: "DELETE"
      });

      const response = await mockRoute.DELETE(request, mockContext);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        message: "Tournament not found"
      });
    });

    it("returns 404 if stream is not found", async () => {
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);
      prisma.tournamentStream.findUnique.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/tournaments/123/streams/456", {
        method: "DELETE"
      });

      const response = await mockRoute.DELETE(request, mockContext);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({
        message: "Stream not found"
      });
    });

    it("returns 403 if non-creator tries to delete stream", async () => {
      getServerSession.mockResolvedValueOnce({
        user: { email: "other@test.com" }
      });
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);
      prisma.tournamentStream.findUnique.mockResolvedValueOnce({ id: "stream-id" });

      const request = new Request("http://localhost/api/tournaments/123/streams/456", {
        method: "DELETE"
      });

      const response = await mockRoute.DELETE(request, mockContext);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        message: "Only tournament creators can remove streams"
      });
    });

    it("successfully deletes a stream", async () => {
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);
      prisma.tournamentStream.findUnique.mockResolvedValueOnce({ id: "stream-id" });
      prisma.tournamentStream.delete.mockResolvedValueOnce({ id: "stream-id" });

      const request = new Request("http://localhost/api/tournaments/123/streams/456", {
        method: "DELETE"
      });

      const response = await mockRoute.DELETE(request, mockContext);
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Stream removed successfully"
      });
      expect(prisma.tournamentStream.delete).toHaveBeenCalledWith({
        where: { id: mockContext.params.streamId }
      });
    });

    it("handles database errors during stream deletion", async () => {
      getServerSession.mockResolvedValueOnce(mockSession);
      prisma.tournament.findUnique.mockResolvedValueOnce(mockTournament);
      prisma.tournamentStream.findUnique.mockResolvedValueOnce({ id: "stream-id" });
      prisma.tournamentStream.delete.mockRejectedValueOnce(new Error("Database error"));

      const request = new Request("http://localhost/api/tournaments/123/streams/456", {
        method: "DELETE"
      });

      const response = await mockRoute.DELETE(request, mockContext);
      
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        message: "Failed to remove stream"
      });
    });
  });
});