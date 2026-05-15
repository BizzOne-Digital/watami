import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import MenuItem from '@/models/MenuItem'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  categoryId: z.string().optional(),
  imageUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  popularOverride: z.enum(['auto', 'force_popular', 'force_not_popular']).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  await connectDB()
  const update: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.name) update.slug = slugify(parsed.data.name)

  // Handle popular override
  if (parsed.data.popularOverride === 'force_popular') {
    update.isPopular = true
  } else if (parsed.data.popularOverride === 'force_not_popular') {
    update.isPopular = false
  }

  const item = await MenuItem.findByIdAndUpdate(id, update, { new: true })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ item })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await connectDB()
  await MenuItem.findByIdAndDelete(id)
  return NextResponse.json({ success: true })
}
