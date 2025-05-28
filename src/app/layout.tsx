"use client";

import { Inter } from "next/font/google";
import TrpcProvider from "~/components/Providers";
import { AppSidebar } from "~/components/sidebar/app-sidebar";
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
  );
}
