import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import Category from '@/models/Category'
import MenuItem from '@/models/MenuItem'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const categories = await Category.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()

    const items = await MenuItem.find({ isAvailable: true })
      .sort({ sortOrder: 1 })
      .lean()

    return NextResponse.json({ categories, items })
  } catch (error) {
    console.error('Menu fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 })
  }
}
