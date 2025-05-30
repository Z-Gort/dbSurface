// app/api/trpc/route.ts
import { appRouter } from '~/server/trpc';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { createContext } from '~/server/trpc/context';

const ALLOWED_ORIGIN = process.env.NEXT_PUBLIC_CLIENT_URL!; // e.g. "http://localhost:3000"
const CORS_HEADERS = {
  'Access-Control-Allow-Origin':      ALLOWED_ORIGIN,
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods':     'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':     'Authorization, Content-Type',
};

// handle preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// wrap your real handler to inject CORS on every response
async function handle(req: Request) {
  // 1) run tRPC
  const res = await fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

  // 2) copy tRPC’s body/status but re-emit headers + our CORS bits
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    headers.set(k, v);
  }

  return new Response(res.body, {
    status:  res.status,
    headers,
  });
}

export { handle as GET, handle as POST };