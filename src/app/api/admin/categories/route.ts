import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import { slugify } from '@/lib/utils'
import { z } from 'zod'

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const categories = await Category.find().sort({ sortOrder: 1 }).lean()
  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = categorySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  await connectDB()
  const slug = slugify(parsed.data.name)
  const existing = await Category.findOne({ slug })
  if (existing) {
    return NextResponse.json({ error: 'Category with this name already exists' }, { status: 409 })
  }

  const category = await Category.create({ ...parsed.data, slug })
  return NextResponse.json({ category }, { status: 201 })
}
