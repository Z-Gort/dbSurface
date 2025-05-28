"use client";

import { Code, CreditCard, Database, Eye } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "~/components/ui/sidebar";

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
      </SidebarContent>
    </Sidebar>
  );
}
