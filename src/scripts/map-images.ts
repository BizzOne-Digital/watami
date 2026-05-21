/**
 * Maps images from public/menu images/ to menu items in MongoDB by name matching.
 * Items with no matching image are left unchanged (imageUrl stays as-is or empty).
 *
 * Run: npx tsx src/scripts/map-images.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

const MenuItemSchema = new mongoose.Schema(
  { name: String, imageUrl: String },
  { strict: false, timestamps: true }
)
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema)

// ── Normalise a string for fuzzy matching ──────────────────────────────────
function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/\.(png|jpg|jpeg|webp)$/i, '') // strip extension
    .replace(/[^a-z0-9]/g, ' ')             // non-alphanumeric → space
    .replace(/\s+/g, ' ')                   // collapse spaces
    .trim()
}

async function run() {
  // 1. Read image filenames
  const imageDir = path.resolve(process.cwd(), 'public', 'menu-images')
  const imageFiles = fs.readdirSync(imageDir).filter(f =>
    /\.(png|jpg|jpeg|webp)$/i.test(f)
  )

  // Build a map: normalised name → original filename
  const imageMap = new Map<string, string>()
  for (const file of imageFiles) {
    imageMap.set(normalise(file), file)
  }

  console.log(`Found ${imageFiles.length} images in public/menu-images/`)

  // 2. Connect and fetch all menu items
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const items = await MenuItem.find({}).lean()
  console.log(`Found ${items.length} menu items in database\n`)

  let matched = 0
  let skipped = 0

  for (const item of items) {
    const normName = normalise(item.name as string)
    const imageFile = imageMap.get(normName)

    if (imageFile) {
      // Clean URL — no encoding needed, Next.js handles spaces in local paths
      const imageUrl = `/menu-images/${imageFile}`
      await MenuItem.updateOne(
        { _id: item._id },
        { $set: { imageUrl } }
      )
      console.log(`✓ ${item.name}  →  ${imageFile}`)
      matched++
    } else {
      // Try partial match — image name starts with item name
      let found: string | undefined
      for (const [normImg, origFile] of imageMap.entries()) {
        if (normImg.startsWith(normName) || normName.startsWith(normImg)) {
          found = origFile
          break
        }
      }
      if (found) {
        const imageUrl = `/menu-images/${found}`
        await MenuItem.updateOne(
          { _id: item._id },
          { $set: { imageUrl } }
        )
        console.log(`~ ${item.name}  →  ${found}  (partial match)`)
        matched++
      } else {
        console.log(`✗ ${item.name}  →  no image`)
        skipped++
      }
    }
  }

  console.log(`\nDone. Matched: ${matched} | No image: ${skipped}`)
  await mongoose.disconnect()
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
