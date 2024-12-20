"use client";
import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTournamentMessage, setShowTournamentMessage] = useState(true);
  const callbackUrl = searchParams.get("callbackUrl");
  const errorType = searchParams.get("error");

  useEffect(() => {
    if (status === "authenticated") {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.push(callbackUrl);
    }
  }, [status, router, searchParams]);

  useEffect(() => {
    // Handle auth errors from URL
    if (errorType === 'Signin') {
      setError("An account with this email already exists.");
    }
  }, [errorType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setShowTournamentMessage(false);

      const callbackUrl = searchParams.get("callbackUrl") || "/";

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        window.location.href = callbackUrl;
      }
    } catch (error) {
      setError("Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const callbackUrl = searchParams.get("callbackUrl") || "/";

      await signIn("google", {
        callbackUrl,
      });
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setError("Error signing in with Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-500">Sign in to your account</p>
        </div>
        
        {showTournamentMessage &&
          decodeURIComponent(searchParams.get("callbackUrl") || "") === "/tournament/create" && (
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-md mb-6">
              <p className="text-sm text-blue-700">
                Please log in to create a tournament
              </p>
            </div>
          )}
          
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors duration-200"
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 transition-colors duration-200"
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          type="button"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700 font-medium"
        >
          <Image
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            width={20}
            height={20}
          />
          Sign in with Google
        </button>

        <Link
          href={`/signup${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="block text-center text-blue-600 hover:text-blue-700 mt-4"
        >
          Don&apos;t have an account? Register
        </Link>
      </div>
    </div>
  );
}