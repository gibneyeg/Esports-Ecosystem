import { NextResponse } from "next/server";

export function handleApiError(error) {
  console.error("API Error:", error);

  if (error.name === "NotFoundError") {
    return NextResponse.json(
      { message: "Resource not found" },
      { status: 404 }
    );
  }

  if (error.name === "UnauthorizedError") {
    return NextResponse.json(
      { message: "Authentication required" },
      { status: 401 }
    );
  }

  if (error.name === "ValidationError") {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { message: "Internal server error" },
    { status: 500 }
  );
}
