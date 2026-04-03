'use client'

import {
  ArrowUpRight,
  Link,
  MoreHorizontal,
  StarOff,
  Trash2,
} from '@/lib/icons'

import {
  ResponsivePopup,
  ResponsivePopupContent,
  ResponsivePopupTrigger,
} from '@/components/ui/responsive-overlay'
import { Button } from '@/components/ui/button'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function NavFavorites({
  favorites,
}: {
  favorites: {
    name: string
    url: string
    emoji: string
  }[]
}) {
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Favorites</SidebarGroupLabel>
      <SidebarMenu>
        {favorites.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url} title={item.name}>
                <span>{item.emoji}</span>
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
            <ResponsivePopup>
              <ResponsivePopupTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </ResponsivePopupTrigger>
              <ResponsivePopupContent className="w-56 rounded-lg" side="right" align="start">
                <Button type="button" variant="ghost" className="flex h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                  <StarOff className="text-muted-foreground" />
                  <span>Remove from Favorites</span>
                </Button>
                <div className="bg-border my-1 h-px" />
                <Button type="button" variant="ghost" className="flex h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                  <Link className="text-muted-foreground" />
                  <span>Copy Link</span>
                </Button>
                <Button type="button" variant="ghost" className="flex h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                  <ArrowUpRight className="text-muted-foreground" />
                  <span>Open in New Tab</span>
                </Button>
                <div className="bg-border my-1 h-px" />
                <Button type="button" variant="ghost" className="flex h-auto w-full justify-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent">
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete</span>
                </Button>
              </ResponsivePopupContent>
            </ResponsivePopup>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontal />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}
