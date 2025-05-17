// ~/utils/api.ts ---------------------------------------------------
import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "~/server/trpc"; // Next.js backend
import type { AppRouterLocal } from "~/server/trpcLocal"; // Express / local

/** Union of all procedures that exist anywhere */
export type UnifiedRouter = AppRouter & AppRouterLocal;

/** Flag we’ll pass per operation so the link can decide the target */
export type ApiContext = { source: "remote" | "local" };

export const trpc = createTRPCReact<UnifiedRouter>();