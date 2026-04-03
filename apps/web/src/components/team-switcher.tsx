'use client'

import * as React from 'react'
import { ChevronDown, Plus } from '@/lib/icons'
import { Button } from '@/components/ui/button'

import {
  ResponsivePopup,
  ResponsivePopupContent,
  ResponsivePopupHeader,
  ResponsivePopupTitle,
  ResponsivePopupTrigger,
} from '@/components/ui/responsive-overlay'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ElementType
    plan: string
  }[]
}) {
  const [activeTeam, setActiveTeam] = React.useState(teams[0])

  if (!activeTeam) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <ResponsivePopup>
          <ResponsivePopupTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
                <activeTeam.logo className="size-3" />
              </div>
              <span className="truncate font-medium">{activeTeam.name}</span>
              <ChevronDown className="opacity-50" />
            </SidebarMenuButton>
          </ResponsivePopupTrigger>
          <ResponsivePopupContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <ResponsivePopupHeader className="px-2 py-2">
              <ResponsivePopupTitle className="text-muted-foreground text-xs font-medium">
                Teams
              </ResponsivePopupTitle>
            </ResponsivePopupHeader>
            {teams.map((team, index) => (
              <Button
                key={team.name}
                type="button"
                variant="ghost"
                onClick={() => setActiveTeam(team)}
                className="flex h-auto w-full justify-start gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
              >
                <div className="flex size-6 items-center justify-center rounded-xs border">
                  <team.logo className="size-4 shrink-0" />
                </div>
                {team.name}
                <span className="ml-auto text-xs tracking-widest text-muted-foreground">
                  ⌘{index + 1}
                </span>
              </Button>
            ))}
            <div className="bg-border my-1 h-px" />
            <Button
              type="button"
              variant="ghost"
              className="flex h-auto w-full justify-start gap-2 rounded-md p-2 text-left text-sm hover:bg-accent"
            >
              <div className="bg-background flex size-6 items-center justify-center rounded-md border">
                <Plus className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium">Add team</div>
            </Button>
          </ResponsivePopupContent>
        </ResponsivePopup>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
