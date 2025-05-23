"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import { Code, CreditCard, Database, Eye } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { BillingPage } from "./Billing";
import { CreditCardIcon } from "./CreditCardIcon";

// Menu items.
const items = [
  {
    title: "Editor",
    url: "/",
    icon: Code,
  },
  {
    title: "Projections",
    url: "/projections",
    icon: Eye,
  },
  {
    title: "Databases",
    url: "/databases",
    icon: Database,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-12 px-0">
            <img
              src="/logo-transparent_no_name.png"
              className="mb-2 h-11 sm:h-12"
              alt="dbSurface"
            />
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarFooter>
          <SignedIn>
            <UserButton>
              <UserButton.UserProfilePage
                label="Billing"
                url="billing"
                labelIcon={<CreditCardIcon />}
              >
                <BillingPage />
              </UserButton.UserProfilePage>
            </UserButton>
          </SignedIn>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
