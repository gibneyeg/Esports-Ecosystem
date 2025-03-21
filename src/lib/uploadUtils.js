
export async function uploadProfilePicture(file) {
  try {
    const compressedImage = await compressImageToBase64(file);

    const response = await fetch("/api/upload-profile-picture", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: compressedImage,
      }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    cleanupDuplicateCookies();
    return await response.json();
  } catch (error) {
    console.error("Profile picture upload error:", error);
    throw error;
  }
}

function compressImageToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
    };
  });
}

function cleanupDuplicateCookies() {
  try {
    const cookieMap = new Map();
    const cookies = document.cookie.split(";");

    cookies.forEach((cookie) => {
      const [name, value] = cookie.trim().split("=");
      if (name.startsWith("next-auth.")) {
        if (!cookieMap.has(name) || value.length > cookieMap.get(name).length) {
          cookieMap.set(name, value);
        }
      }
    });

    cookies.forEach((cookie) => {
      const [name] = cookie.trim().split("=");
      if (name.startsWith("next-auth.")) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      }
    });

    cookieMap.forEach((value, name) => {
      document.cookie = `${name}=${value}; path=/`;
    });
  } catch (error) {
    console.error("Cookie cleanup error:", error);
  }
}
