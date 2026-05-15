import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import MenuItem from '@/models/MenuItem'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string(),
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

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get('categoryId')
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = parseInt(searchParams.get('limit') ?? '50')

  await connectDB()
  const query = categoryId ? { categoryId } : {}
  const total = await MenuItem.countDocuments(query)
  const items = await MenuItem.find(query)
    .populate('categoryId', 'name')
    .sort({ sortOrder: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return NextResponse.json({ items, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = itemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  let slug = slugify(parsed.data.name)
  const existing = await MenuItem.findOne({ slug })
  if (existing) slug = `${slug}-${Date.now()}`

  const item = await MenuItem.create({ ...parsed.data, slug })
  return NextResponse.json({ item }, { status: 201 })
}
