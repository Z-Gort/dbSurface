"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import { Code, Database, Eye, CreditCard } from "lucide-react";
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
import {
  RegisterLink,
  LoginLink,
  LogoutLink,
} from "@kinde-oss/kinde-auth-nextjs/components";

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
  {
    title: "Billing & Usage",
    url: "/billing",
    icon: CreditCard,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="mt-8 h-6 px-0">
            <img
              src="/logo-transparent_no_name.png"
              className="mb-10 h-6 sm:h-11"
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
          <LoginLink>Sign in</LoginLink>
          <RegisterLink>Sign up</RegisterLink>
          <LogoutLink>Log out</LogoutLink>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
