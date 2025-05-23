import { localRouter } from "./routes/local";
import { router } from "./trpcLocal";

export const appRouterLocal = router({
  local: localRouter,
});

export type AppRouterLocal = typeof appRouterLocal;
