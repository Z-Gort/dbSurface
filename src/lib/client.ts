import { createTRPCReact } from "@trpc/react-query";

import type { AppRouter } from "~/server/trpc"; 
import type { AppRouterLocal } from "~/server/trpcLocal"; 

export type UnifiedRouter = AppRouter & AppRouterLocal;

export type ApiContext = { source: "remote" | "local" };

export const trpc = createTRPCReact<UnifiedRouter>();