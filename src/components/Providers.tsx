"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { trpc, type ApiContext } from "~/lib/client";
import { httpBatchLink, splitLink } from "@trpc/client";
import superjson from "superjson";

const TrpcProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        splitLink({
          condition: (op) => (op.context as ApiContext)?.source !== "local",

          true: httpBatchLink({
            url: `${process.env.VERCEL_REMOTE_URL}/api/trpc`,
            fetch: (url, opts) =>
              fetch(url, { ...opts, credentials: "include" }),
          }),

          false: httpBatchLink({
            url: "/api/trpcLocal",
            fetch: (url, opts) =>
              fetch(url, { ...opts, credentials: "include" }),
          }),
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        {children}
      </trpc.Provider>
    </QueryClientProvider>
  );
};

export default TrpcProvider;
