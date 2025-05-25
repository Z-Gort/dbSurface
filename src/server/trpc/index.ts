import { router } from "./trpc";
import { projectionsRouter } from "./routes/projections";
import { databasesRouter } from "./routes/databases";
import { stripeRouter } from "./routes/stripe";
import { usersRouter } from "./routes/users";

export const appRouter = router({
  projections: projectionsRouter,
  databases: databasesRouter,
  stripe: stripeRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
