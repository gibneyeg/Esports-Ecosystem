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
            return true;
          } else {
            await prisma.user.create({
              data: {
                email: profile.email,
                name: profile.name,
                username: profile.name,
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
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name || user.username;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { rank: true, points: true, username: true },
          });
          if (dbUser) {
            session.user.rank = dbUser.rank;
            session.user.points = dbUser.points;
            session.user.username = dbUser.username;
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});

export { handler as GET, handler as POST };
