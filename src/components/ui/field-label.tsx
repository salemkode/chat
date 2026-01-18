import * as React from 'react'
import { cn } from '@/lib/utils'

type FieldLabelProps = React.ComponentProps<'label'> & {
  htmlFor: string
}

function FieldLabel({ className, htmlFor, ...props }: FieldLabelProps) {
  return (
    <label
      data-slot="label"
      htmlFor={htmlFor}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  )
}

export { FieldLabel }
