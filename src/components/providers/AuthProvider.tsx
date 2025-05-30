"use client";

import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import { type ReactNode, useEffect, type PropsWithChildren } from "react";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

function InnerGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, login } = useKindeAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // kick off the redirect-to-Kinde flow
      void login();
    }
  }, [isLoading, isAuthenticated, login]);

  if (isLoading || !isAuthenticated) {
    // show logo with loading state...
    return null;
  }

  return <>{children}</>;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <KindeProvider
      clientId={process.env.NEXT_PUBLIC_KINDE_CLIENT_ID!}
      domain={process.env.NEXT_PUBLIC_KINDE_DOMAIN!}
      redirectUri={origin}
      logoutUri={origin}
    >
      <InnerGate>{children}</InnerGate>
    </KindeProvider>
  );
}
