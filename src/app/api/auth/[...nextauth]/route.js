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
            image: user.image,
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
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { accounts: true },
          });

          if (existingUser) {
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

            // Update user information
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
            // Create new user
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

            return true;
          }
        }
        return true;
      } catch (error) {
        console.error("SignIn error:", error);
        return false;
      }
    },
    async jwt({ token, user, trigger, session }) {
      if (trigger === "signIn" && user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            rank: true,
            points: true,
            image: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.rank = dbUser.rank;
          token.points = dbUser.points;
          token.image = dbUser.image;
        }
      }

      // Handle session update
      if (trigger === "update" && session?.user) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            rank: true,
            points: true,
            username: true,
            image: true,
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          token.username = dbUser.username;
          token.rank = dbUser.rank;
          token.points = dbUser.points;
          token.image = dbUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        //  user data including tournament information
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: {
            id: true,
            rank: true,
            points: true,
            username: true,
            image: true,
            createdTournaments: {
              select: {
                id: true,
                name: true,
                game: true,
                status: true,
                startDate: true,
                endDate: true,
                maxPlayers: true,
                participants: {
                  select: {
                    id: true,
                    userId: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
            },
            tournaments: {
              select: {
                tournament: {
                  select: {
                    id: true,
                    name: true,
                    game: true,
                    status: true,
                    startDate: true,
                    endDate: true,
                  },
                },
              },
              orderBy: {
                joinedAt: "desc",
              },
            },
          },
        });

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.username = dbUser.username;
          session.user.rank = dbUser.rank;
          session.user.points = dbUser.points;
          session.user.image = dbUser.image;

          // Add tournament data
          session.user.createdTournaments = dbUser.createdTournaments.map(
            (t) => ({
              ...t,
              participantCount: t.participants.length,
            })
          );

          session.user.participatingTournaments = dbUser.tournaments.map(
            (t) => t.tournament
          );
        }

        session.user.email = token.email;
        session.user.name = token.name;
        session.user.image = token.image || dbUser?.image; // Use token image or fallback to dbUser image
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours - prevents too frequent session updates
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  // debug: process.env.NODE_ENV === "development",
});

export { handler as GET, handler as POST };
export const authOptions = handler;
