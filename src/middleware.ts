import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  //if browser's pre-flight always pass
  if (request.method === "OPTIONS") {
    return NextResponse.next({ headers: cors(origin) });
  }

  //let pass to inngest
  if (pathname === "/api/inngest" || pathname.startsWith("/api/inngest/")) {
    return NextResponse.next();
  }

  //tRPC calls: skip auth, add CORS
  if (pathname.startsWith("/api/trpc")) {
    return NextResponse.next({ headers: cors(origin) });
  }

  //everything else protect
  await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
