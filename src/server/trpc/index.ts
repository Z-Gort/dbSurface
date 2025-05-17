import { router } from "./trpc";
import { projectionsRouter } from "./routes/projections";
import { databasesRouter } from "./routes/databases";

export const appRouter = router({
  projections: projectionsRouter,
  databases: databasesRouter,
});

export type AppRouter = typeof appRouter;
