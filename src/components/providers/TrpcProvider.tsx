"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useState } from "react";
import { trpc, type ApiContext } from "~/lib/client";
import { httpBatchLink, splitLink } from "@trpc/client";
import superjson from "superjson";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

const TrpcProvider = ({ children }: PropsWithChildren) => {
  const [queryClient] = useState(() => new QueryClient());
  const { getAccessToken } = useKindeAuth();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      transformer: superjson,
      links: [
        splitLink({
          condition: (op) => (op.context as ApiContext)?.source !== "local",

          true: httpBatchLink({
            url: `${process.env.NEXT_PUBLIC_VERCEL_REMOTE_URL}/api/trpc/`,
            fetch: async (url, opts) => {
              const token = await getAccessToken();
              return fetch(url, {
                ...opts,
                headers: {
                  ...opts?.headers,
                  Authorization: `Bearer ${token}`,
                },
              });
            },
          }),

          false: httpBatchLink({
            url: "/api/trpcLocal",
            fetch: (url, opts) =>
              fetch(url, { ...opts, credentials: "include" }), //unused as right now local api doesn't secure with cookies
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
