import { getSession } from "next-auth/react";

export async function uploadProfilePicture(file) {
  try {
    const session = await getSession();

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/user/profile-picture", {
      method: "POST",
      headers: {
        // Do not set Content-Type header when using FormData
        Authorization: `Bearer ${session?.token}`, // If you're using JWT
      },
      body: formData,
      credentials: "include", // Important for cookie handling
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    // Clean up any duplicate cookies that might have been created
    const existingCookies = document.cookie.split(";");
    const seenCookies = new Set();

    existingCookies.forEach((cookie) => {
      const [name] = cookie.trim().split("=");
      if (name.startsWith("next-auth.")) {
        if (seenCookies.has(name)) {
          // Remove duplicate cookie
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        } else {
          seenCookies.add(name);
        }
      }
    });

    return await response.json();
  } catch (error) {
    console.error("Profile picture upload error:", error);
    throw error;
  }
}
