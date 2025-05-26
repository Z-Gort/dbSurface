import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "~/server/trpc";
import { createContext } from "~/server/trpc/context";

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  } as const;
}

export function OPTIONS(req: Request) {
  return new Response(null, {
    status: 204,
    headers: cors(req.headers.get("Origin")),
  });
}

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext,
    responseMeta() {
      return { headers: cors(req.headers.get("Origin")) };
    },
  });

export { handler as GET, handler as POST };
