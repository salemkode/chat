import * as React from 'react'
import { cn } from '@/lib/utils'

function FieldSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="separator"
      className={cn('flex items-center gap-4 py-2', className)}
      {...props}
    >
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-xs uppercase">
        Or continue with
      </span>
      <div className="bg-border h-px flex-1" />
    </div>
  )
}

export { FieldSeparator }
