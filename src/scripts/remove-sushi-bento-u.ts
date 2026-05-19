/**
 * One-time script: removes the "Sushi Bento U" category and all its menu items
 * from the database.
 *
 * Run: npx tsx src/scripts/remove-sushi-bento-u.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

const CategorySchema = new mongoose.Schema(
  { name: String, slug: String, description: String, sortOrder: Number, isActive: Boolean },
  { timestamps: true }
)
const MenuItemSchema = new mongoose.Schema(
  { name: String, categoryId: mongoose.Schema.Types.ObjectId },
  { timestamps: true }
)

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema)
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema)

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  const category = await Category.findOne({ name: 'Sushi Bento U' })

  if (!category) {
    console.log('Category "Sushi Bento U" not found — nothing to remove.')
    await mongoose.disconnect()
    return
  }

  const deletedItems = await MenuItem.deleteMany({ categoryId: category._id })
  console.log(`Deleted ${deletedItems.deletedCount} menu items from "Sushi Bento U"`)

  await Category.deleteOne({ _id: category._id })
  console.log('Deleted category "Sushi Bento U"')

  await mongoose.disconnect()
  console.log('Done.')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
