import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const MicrosoftProvider = {
  id: "microsoft",
  name: "Microsoft",
  type: "oauth",
  wellKnown: "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
  authorization: { params: { scope: "openid profile email User.Read" } },
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  profile(profile) {
    return {
      id: profile.sub,
      name: profile.name,
      email: profile.email,
      image: null,
    };
  },
};

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    MicrosoftProvider,
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember Me", type: "checkbox" }
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

          if (!user.emailVerified && user.password) {
            throw new Error("Please verify your email before logging in");
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
            remember: credentials.remember === "true"
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
  events: {
    signOut: async ({ session, token }) => {
      if (session?.user?.email) {
        await prisma.session.deleteMany({
          where: {
            user: {
              email: session.user.email,
            },
          },
        });

        const now = new Date();
        await prisma.session.deleteMany({
          where: {
            expires: {
              lt: now,
            },
          },
        });
      }
    },
  },
  callbacks: {
    async signIn({ account, profile, user }) {
      try {
        if (account.provider === "microsoft") {
          // Fetch profile photo using Microsoft Graph API with the access token
          if (account.access_token) {
            try {
              const photoResponse = await fetch('https://graph.microsoft.com/v1.0/me/photo/$value', {
                headers: {
                  Authorization: `Bearer ${account.access_token}`
                }
              });

              // If photo exists, upload to Cloudinary
              if (photoResponse.ok) {
                const photoArrayBuffer = await photoResponse.arrayBuffer();
                const photoBase64 = Buffer.from(photoArrayBuffer).toString('base64');
                const photoContentType = photoResponse.headers.get('content-type') || 'image/jpeg';
                const photoDataUrl = `data:${photoContentType};base64,${photoBase64}`;

                const uploadResponse = await cloudinary.uploader.upload(photoDataUrl, {
                  upload_preset: "profile_pictures"
                });

                user.image = uploadResponse.secure_url;
              }
            } catch (photoError) {
              console.error("Error handling Microsoft profile photo:", photoError);
            }
          }
        }

        if (account.provider === "discord" || account.provider === "google" || account.provider === "microsoft") {
          const existingUser = await prisma.user.findUnique({
            where: { email: profile.email },
            include: { accounts: true },
          });

          if (existingUser) {
            const hasProviderAccount = existingUser.accounts.some(
              (acc) => acc.provider === account.provider
            );

            if (!hasProviderAccount) {
              return `/login?error=Signin`;
            }

            // Update profile picture for Microsoft users if we have a new one
            if (account.provider === "microsoft" && user.image) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { image: user.image }
              });
            }

            return true;
          }

          // Get profile image based on provider
          let profileImage = null;

          if (account.provider === "google" && profile.picture) {
            profileImage = profile.picture;
          } else if (account.provider === "discord" && profile.avatar) {
            profileImage = `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`;
          } else if (account.provider === "microsoft" && user.image) {
            profileImage = user.image;
          }

          // Create a username - use name if available, or email prefix
          const username = profile.name || profile.email.split('@')[0];

          await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name || username,
              username: username,
              image: profileImage,
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
                  refresh_token: account.refresh_token,
                },
              },
            },
          });

          try {
            await fetch(`${process.env.NEXTAUTH_URL}/api/revalidate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                path: '/api/leaderboard'
              })
            });
          } catch (error) {
            console.error('Error revalidating leaderboard:', error);
          }

          return true;
        }
        return true;
      } catch (error) {
        console.error("SignIn error:", error);
        return false;
      }
    },

    // Rest of the callbacks remain unchanged
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

          if (!user.remember) {
            token.maxAge = 24 * 60 * 60;
          }
        }
      }

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
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production"
          ? process.env.NEXTAUTH_URL?.split('://')[1]
          : undefined
      },
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };