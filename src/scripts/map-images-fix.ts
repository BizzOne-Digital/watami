/**
 * Fixes the remaining unmatched items where image filename differs slightly from DB name.
 * Run: npx tsx src/scripts/map-images-fix.ts
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!
const MenuItemSchema = new mongoose.Schema({ name: String, imageUrl: String }, { strict: false, timestamps: true })
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema)

// Manual mappings: DB item name → image filename in public/menu images/
const MANUAL_MAPS: Record<string, string> = {
  'Spicy Tuna Avocado Roll (GF)':              'Spicy Tuna Acovdo Roll (GF).png',
  'Fash Twitch - Strawberry Lemonade 350ml':   'Fash Twich - Strawberry Lemonade 350ml.png',
  'Fash Twitch - Cool Blue 350ml':             'Fash Twich - Strawberry Lemonade 350ml.png', // no cool blue image, skip
  'Orange Juice Spring Valley 300ml':          'Orange Juice Spring Velley 300ml.png',
  'Pepsi Max Can 325ml':                       'Pepsi Can 325ml.png',
  'Melon Ramune (Japanese Beverages) 200ml':   '', // no image available
  'Peach Ramune (Japanese Beverages) 200ml':   '', // no image available
  'Lychee Aloe Vera 490ml':                    '', // no image available
  'No sugar Lemon Ice Tea Lipton 500ml':       '', // no image available
  'No Sugar Peach Ice Tea Lipton 500ml':       '', // no image available
  'Solo 600ml':                                '', // no image available
  'Peach Ice Tea Lipton 500ml':               '', // no image available
  'Peach No Sugar Active Gatorade':            '', // no image available
  'Wagyu Beef Udon':                           '', // no image available
  'Panko Prawn Nigiri Box 6pc':               '', // no image available
  'Crabstick Salad Inari Box 4pc':            '', // no image available
}

async function run() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  for (const [itemName, imageFile] of Object.entries(MANUAL_MAPS)) {
    if (!imageFile) {
      console.log(`✗ ${itemName}  →  no image (skipped)`)
      continue
    }
    const imageUrl = `/menu%20images/${encodeURIComponent(imageFile)}`
    const result = await MenuItem.updateOne({ name: itemName }, { $set: { imageUrl } })
    if (result.matchedCount > 0) {
      console.log(`✓ ${itemName}  →  ${imageFile}`)
    } else {
      console.log(`? ${itemName}  →  item not found in DB`)
    }
  }

  console.log('\nDone.')
  await mongoose.disconnect()
}

run().catch(err => { console.error(err); process.exit(1) })
