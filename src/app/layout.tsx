import { Inter } from "next/font/google";
import TrpcProvider from "~/components/providers/TrpcProvider";
import { AppSidebar } from "~/components/sidebar/app-sidebar";
import { TabProvider } from "~/components/providers/TabContext";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { Toaster } from "~/components/ui/toaster";
import { cn } from "~/lib/tailwindUtils";
import { AuthProvider } from "~/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
