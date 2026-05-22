/**
 * Fixes missing imageUrl fields for all menu items in MongoDB.
 * Matches item names to image filenames using fuzzy normalisation.
 *
 * Run against LOCAL DB:
 *   npx tsx src/scripts/fix-image-urls.ts
 *
 * Run against PRODUCTION DB (MongoDB Atlas):
 *   MONGODB_URI="mongodb+srv://..." npx tsx src/scripts/fix-image-urls.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI not set in .env.local')

const MenuItemSchema = new mongoose.Schema(
  { name: String, imageUrl: String },
  { strict: false, timestamps: true }
)
const MenuItem =
  mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema)

function normalise(str: string): string {
  return str
    .toLowerCase()
    .replace(/\.(png|jpg|jpeg|webp)$/i, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function run() {
  const imageDir = path.resolve(process.cwd(), 'public', 'menu-images')
  const imageFiles = fs.readdirSync(imageDir).filter((f) =>
    /\.(png|jpg|jpeg|webp)$/i.test(f)
  )

  // Build normalised → original filename map
  const imageMap = new Map<string, string>()
  for (const file of imageFiles) {
    imageMap.set(normalise(file), file)
  }
  console.log(`Found ${imageFiles.length} images in public/menu-images/\n`)

  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB\n')

  const items = await MenuItem.find({}).lean()
  console.log(`Found ${items.length} menu items\n`)

  let matched = 0
  let alreadySet = 0
  let skipped = 0

  for (const item of items) {
    const normName = normalise(item.name as string)

    // Exact match
    let imageFile = imageMap.get(normName)

    // Partial match if no exact
    if (!imageFile) {
      for (const [normImg, origFile] of imageMap.entries()) {
        if (normImg.startsWith(normName) || normName.startsWith(normImg)) {
          imageFile = origFile
          break
        }
      }
    }

    if (imageFile) {
      const imageUrl = `/menu-images/${imageFile}`
      if ((item as { imageUrl?: string }).imageUrl === imageUrl) {
        alreadySet++
        continue
      }
      await MenuItem.updateOne({ _id: item._id }, { $set: { imageUrl } })
      console.log(`✓  ${item.name}  →  ${imageFile}`)
      matched++
    } else {
      console.log(`✗  ${item.name}  →  no matching image`)
      skipped++
    }
  }

  console.log(`\n─────────────────────────────────────`)
  console.log(`Updated : ${matched}`)
  console.log(`Already correct: ${alreadySet}`)
  console.log(`No image found : ${skipped}`)
  console.log(`─────────────────────────────────────`)

  await mongoose.disconnect()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
