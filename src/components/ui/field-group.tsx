import * as React from 'react'
import { cn } from '@/lib/utils'

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="group"
      className={cn('flex flex-col gap-6', className)}
      {...props}
    />
  )
}

export { FieldGroup }
