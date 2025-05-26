import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/trpc";
import { createContext } from "~/server/trpc/context";

const ALLOWED_ORIGIN = "http://localhost:4800";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    responseMeta() {
      return { headers: cors };
    },
  });

export { handler as GET, handler as POST };