"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { AppSidebar } from "~/components/sidebar/app-sidebar";
import TrpcProvider from "~/components/Providers";
import { TabProvider } from "~/components/TabContext";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/toaster";
import { cn } from "~/lib/tailwindUtils";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          userButtonPopoverRootBox: {
            pointerEvents: "auto", //when sidebar is closed, make sure clicks go through
          },
        },
      }}
    >
      <html lang="en" className="h-full">
        <body
          className={cn(
            "relative h-full font-sans antialiased",
            inter.className,
          )}
        >
          <TrpcProvider>
            <TabProvider>
              <SidebarProvider>
                <AppSidebar />
                <SidebarTrigger />
                {children}
                <Toaster />
              </SidebarProvider>
            </TabProvider>
          </TrpcProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
