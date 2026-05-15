import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-burgundy text-white',
        secondary: 'border-transparent bg-orange text-white',
        destructive: 'border-transparent bg-red-600 text-white',
        outline: 'text-charcoal border-charcoal',
        popular: 'border-transparent bg-orange text-white',
        vegetarian: 'border-transparent bg-green-600 text-white',
        gf: 'border-transparent bg-blue-600 text-white',
        spicy: 'border-transparent bg-red-500 text-white',
        unavailable: 'border-transparent bg-gray-400 text-white',
        promo: 'border-transparent bg-yellow-500 text-charcoal',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
