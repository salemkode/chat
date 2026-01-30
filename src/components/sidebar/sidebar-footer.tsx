'use client'

import { Link } from '@tanstack/react-router'
import { LogIn, LogOut, User, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface SidebarFooterProps {
  isAuthenticated?: boolean
  user?: {
    name?: string
    email?: string
    image?: string
  } | null
  onLogout?: () => void
  onSettings?: () => void
}

export function SidebarFooter({
  isAuthenticated = false,
  user,
  onLogout,
  onSettings,
}: SidebarFooterProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-2 m-0 p-2 pt-0">
        {isAuthenticated ? (
          <>
            {/* User Profile */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg p-3 text-muted-foreground",
                    "select-none hover:bg-sidebar-accent transition-colors",
                    "[&_svg]:size-4"
                  )}
                  onClick={onSettings}
                >
                  {user?.image ? (
                    <img
                      src={user.image}
                      alt={user.name || 'User'}
                      className="size-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="size-4 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-col items-start flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user?.name || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email || ''}
                    </span>
                  </div>
                  <Settings className="size-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>

            {/* Logout Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  aria-label="Logout"
                  role="button"
                  onClick={onLogout}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-lg p-4 text-muted-foreground",
                    "select-none hover:bg-sidebar-accent transition-colors",
                    "[&_svg]:size-4"
                  )}
                >
                  <LogOut aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          /* Login Button */
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/auth/login"
                aria-label="Login"
                role="button"
                className={cn(
                  "flex w-full items-center gap-4 rounded-lg p-4 text-muted-foreground",
                  "select-none hover:bg-sidebar-accent transition-colors",
                  "[&_svg]:size-4"
                )}
              >
                <LogIn aria-hidden="true" />
                <span>Login</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Login to your account</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
