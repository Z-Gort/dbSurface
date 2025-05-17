import { router } from "./trpcLocal";
import { localRouter } from "./routes/local";

export const appRouterLocal = router({
  local: localRouter,
});

export type AppRouterLocal = typeof appRouterLocal;
