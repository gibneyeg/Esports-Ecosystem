"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
<<<<<<< HEAD
import Link from "next/link";

export default function LoginPage() {
=======

const LoginPage = () => {
>>>>>>> d2414ec (Login page with fake users to log in as)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

<<<<<<< HEAD
=======
  // Expanded fake user database with usernames
  const USERS = [
    {
      email: "user@example.com",
      password: "password123",
      username: "WarriorGamer",
      avatar: "/fakeAvatar.png",
      rank: "Gold",
      points: 1250,
    },
    {
      email: "test@test.com",
      password: "test123",
      username: "ProPlayer123",
      avatar: "/fakeAvatar.png",
      rank: "Silver",
      points: 850,
    },
  ];

>>>>>>> d2414ec (Login page with fake users to log in as)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
<<<<<<< HEAD
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store user data in localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          username: data.username,
          email: data.email,
          rank: data.rank,
          points: data.points,
        })
      );

      // Redirect to home page
      router.push("/");
      window.location.reload(); // Refresh to update header state
    } catch (err) {
      setError(err.message);
=======
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check credentials against fake database
      const user = USERS.find((u) => u.email === email);

      if (!user) {
        setError("No account found with this email");
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError("Incorrect password");
        setLoading(false);
        return;
      }

      // Store more user information
      localStorage.setItem(
        "user",
        JSON.stringify({
          email: user.email,
          username: user.username,
          rank: user.rank,
          points: user.points,
          avatar: user.avatar,
        })
      );

      router.push("/");
      window.location.reload();
    } catch (err) {
      setError("An error occurred. Please try again.");
>>>>>>> d2414ec (Login page with fake users to log in as)
    }

    setLoading(false);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Login to Your Account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

<<<<<<< HEAD
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-700"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>

=======
>>>>>>> d2414ec (Login page with fake users to log in as)
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>
<<<<<<< HEAD

        <p className="mt-4 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue-500 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
=======
      </div>
    </main>
  );
};

export default LoginPage;
>>>>>>> d2414ec (Login page with fake users to log in as)
