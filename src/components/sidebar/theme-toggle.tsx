'use client'

import * as React from 'react'
import { Monitor, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button 
        className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-muted/40 hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-foreground group relative size-8"
        tabIndex={-1}
        style={{ WebkitTouchCallout: 'none' }}
      >
        <Monitor className="size-4" aria-hidden="true" />
        <span className="sr-only">Toggle theme</span>
      </button>
    )
  }

  const handleToggle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  return (
    <button 
      className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-muted/40 hover:text-foreground disabled:hover:bg-transparent disabled:hover:text-foreground group relative size-8 [&>svg]:absolute [&>svg]:top-1/2 [&>svg]:size-4 [&>svg]:-translate-y-1/2"
      onClick={handleToggle}
      tabIndex={-1}
      style={{ WebkitTouchCallout: 'none' }}
    >
      <Monitor 
        className={cn(
          "transition-transform duration-200",
          theme === 'system' ? "scale-100" : "scale-0"
        )} 
        aria-hidden="true" 
      />
      <Sun 
        className={cn(
          "transition-transform duration-200",
          theme === 'light' ? "scale-100" : "scale-0"
        )} 
        aria-hidden="true" 
      />
      <Moon 
        className={cn(
          "transition-transform duration-200",
          theme === 'dark' ? "scale-100" : "scale-0"
        )} 
        aria-hidden="true" 
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
