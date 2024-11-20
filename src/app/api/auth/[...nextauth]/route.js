import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Missing credentials");
          }
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });
          if (!user || !user.password) {
            throw new Error("Invalid credentials");
          }
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );
          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }
          return {
            id: user.id,
            email: user.email,
            name: user.username,
          };
        } catch (error) {
          throw new Error(error.message);
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ account, profile }) {
      try {
        if (account.provider === "google") {
          // First try to find an existing user
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { accounts: true },
          });

          if (existingUser) {
            // Check if Google account needs to be linked
            if (
              !existingUser.accounts?.some((acc) => acc.provider === "google")
            ) {
              await prisma.account.create({
                data: {
                  userId: existingUser.id,
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              });
            }

            // Update user information if needed
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: profile.name,
                image: profile.picture,
                emailVerified: new Date(),
              },
            });

            return true;
          } else {
            // Create new user with Google account
            const newUser = await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name,
                username: profile.name,
                image: profile.picture,
                rank: "Bronze",
                points: 0,
                emailVerified: new Date(),
                accounts: {
                  create: {
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                  },
                },
              },
            });

            console.log("Created new user:", newUser);
            return true;
          }
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign in
      if (account && user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            rank: true,
            points: true,
          },
        });

        return {
          ...token,
          id: dbUser.id,
          username: dbUser.username,
          rank: dbUser.rank,
          points: dbUser.points,
        };
      }

      // Return previous token if the user data hasn't been fetched recently
      return token;
    },
    async session({ session, token }) {
      if (session?.user && token) {
        // Get fresh user data
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            rank: true,
            points: true,
            username: true,
            createdTournaments: {
              select: {
                id: true,
                name: true,
                game: true,
                status: true,
              },
            },
            tournaments: {
              select: {
                tournamentId: true,
              },
            },
          },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.rank = dbUser.rank;
          session.user.points = dbUser.points;
          session.user.username = dbUser.username;
          session.user.createdTournaments = dbUser.createdTournaments;
          session.user.participatingTournaments = dbUser.tournaments;
        }

        // Log session data for debugging
        console.log("Updated session:", session);
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log("SignIn event:", { user, account, profile });
    },
    async createUser({ user }) {
      console.log("CreateUser event:", user);
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
export const authOptions = handler;
