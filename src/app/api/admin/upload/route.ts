import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

async function requireAdmin() {
  const session = await auth()
  if (!session || session.user?.role !== 'admin') return null
  return session
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, and WebP images are allowed' }, { status: 400 })
  }

  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size must be under 5MB' }, { status: 400 })
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const ext = path.extname(file.name) || '.png'
  const baseName = path.basename(file.name, ext)
    .replace(/[<>:"/\\|?*]/g, '')
    .trim()
  const fileName = `${baseName}${ext}`

  const uploadDir = path.join(process.cwd(), 'public', 'menu-images')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, fileName), buffer)

  return NextResponse.json({ imageUrl: `/menu-images/${fileName}` })
}
