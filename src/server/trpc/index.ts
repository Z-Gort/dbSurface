import { router } from "./trpc";
import { projectionsRouter } from "./routes/projections";
import { databasesRouter } from "./routes/databases";
import { stripeRouter } from "./routes/stripe";

export const appRouter = router({
  projections: projectionsRouter,
  databases: databasesRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
