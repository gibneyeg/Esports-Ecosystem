"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // Get the stored redirect URL
      const redirectUrl = sessionStorage.getItem("redirectUrl");

      if (redirectUrl) {
        // Clear the stored redirect URL
        sessionStorage.removeItem("redirectUrl");
        // Redirect to the stored URL
        router.push(redirectUrl);
      } else {
        // Default redirect to home if no stored URL
        router.push("/");
      }
    }
  }, [status, router]);

  return null;
}
