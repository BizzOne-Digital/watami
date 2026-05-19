/**
 * Seed script for Watami Japanese Food
 * Run: npx tsx src/scripts/seed.ts
 */
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MONGODB_URI = process.env.MONGODB_URI!
if (!MONGODB_URI) throw new Error('MONGODB_URI not set')

// ---- Inline schemas to avoid Next.js module issues in scripts ----
const CategorySchema = new mongoose.Schema(
  { name: String, slug: String, description: String, sortOrder: Number, isActive: Boolean },
  { timestamps: true }
)
const MenuItemSchema = new mongoose.Schema(
  {
    name: String, slug: String, description: String, price: Number,
    categoryId: mongoose.Schema.Types.ObjectId, imageUrl: String,
    tags: [String], isAvailable: Boolean, isPopular: Boolean,
    popularOverride: { type: String, default: 'auto' },
    orderCount: { type: Number, default: 0 }, sortOrder: Number,
  },
  { timestamps: true }
)
const UserSchema = new mongoose.Schema(
  { name: String, email: String, phone: String, passwordHash: String, role: String, status: String },
  { timestamps: true }
)

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema)
const MenuItem = mongoose.models.MenuItem || mongoose.model('MenuItem', MenuItemSchema)
const User = mongoose.models.User || mongoose.model('User', UserSchema)

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
}

const CATEGORIES = [
  { name: 'Rice', description: 'Rice bowls and donburi', sortOrder: 1 },
  { name: 'Ramen noodle soup', description: 'Japanese ramen noodle soups', sortOrder: 2 },
  { name: 'Udon noodle soup', description: 'Japanese udon noodle soups', sortOrder: 3 },
  { name: 'Bento', description: 'Bento box meals', sortOrder: 4 },
  { name: 'Entrée', description: 'Starters and sides', sortOrder: 5 },
  { name: 'Platter', description: 'Sushi platters for sharing', sortOrder: 6 },
  { name: 'Hand Roll U', description: 'Hand rolls', sortOrder: 7 },
  { name: 'Sushi Box U', description: 'Sushi boxes', sortOrder: 8 },
  { name: 'Drinks U', description: 'Beverages', sortOrder: 9 },
  { name: 'Sauce', description: 'Sauces and condiments', sortOrder: 10 },
]

type MenuItemSeed = { name: string; price: number; description: string; tags?: string[] }
type CategoryItems = Record<string, MenuItemSeed[]>

const MENU_ITEMS: CategoryItems = {
  'Rice': [
    { name: 'Curry Katsu Don chicken 鸡扒', price: 18.30, description: 'Curry rice bowl with chicken katsu, carrot, potato, and pickle.' },
    { name: 'Curry Katsu Don pork 猪扒', price: 18.30, description: 'Curry rice bowl with pork katsu, carrot, potato, and pickle.' },
    { name: 'Curry Karaage Chicken Don', price: 15.80, description: 'Curry rice bowl with karaage chicken, carrot, potato, and pickle.' },
    { name: 'Curry Tofu Don', price: 15.80, description: 'Curry rice bowl with tofu, carrot, potato, and pickle.', tags: ['vegetarian'] },
    { name: 'Curry Potato Croquette Don', price: 15.80, description: 'Curry rice bowl topped with potato croquette.' },
    { name: 'Curry Grill Chicken Don', price: 18.30, description: 'Curry rice bowl topped with grilled chicken.' },
    { name: 'Katsu don chicken 鸡扒', price: 20.80, description: 'Chicken katsu don with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Katsu don pork 猪扒', price: 20.80, description: 'Pork katsu don with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Katsu don Prawn', price: 20.80, description: 'Prawn katsu don with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Teriyaki Tofu Don', price: 15.80, description: 'Teriyaki tofu rice bowl with broccoli and pickle.', tags: ['vegetarian'] },
    { name: 'Teriyaki Chicken Don', price: 18.30, description: 'Teriyaki chicken don with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Wagyu Beef Don', price: 24.80, description: 'Wagyu beef don with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Unagi Don', price: 22.80, description: 'Unagi rice bowl with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Teriyaki Salmon Don', price: 24.80, description: 'Teriyaki salmon don with broccoli, corn salad, half-cooked egg, and pickle.' },
    { name: 'Salmon Sashimi Don', price: 22.80, description: 'Rice bowl topped with salmon sashimi.' },
    { name: 'Gyu Tan Don', price: 30.90, description: 'Rice bowl topped with gyu tan.' },
    { name: 'Double Cooked Pork Belly Don', price: 22.80, description: 'Pork belly don with broccoli, marinated egg, and spring onion.' },
    { name: 'Truffle Chicken Fried Rice', price: 25.10, description: 'Fried rice with chicken and truffle flavour.' },
    { name: 'Spicy Beef Fried Rice', price: 22.80, description: 'Fried rice with spicy beef.', tags: ['spicy'] },
    { name: 'Curry Katsu Prawn Don 5p', price: 18.30, description: 'Curry rice bowl with 5 pieces of katsu prawn.' },
    { name: 'Spicy Beef Don', price: 22.80, description: 'Rice bowl topped with spicy beef.', tags: ['spicy'] },
    { name: 'Plain Curry with Rice', price: 12.90, description: 'Plain curry served with rice.' },
    { name: 'extra curry', price: 5.00, description: 'Extra curry sauce.' },
    { name: 'Steam Rice (S)', price: 3.70, description: 'Small steamed rice.' },
    { name: 'Steam Rice (L)', price: 5.00, description: 'Large steamed rice.' },
  ],
  'Ramen noodle soup': [
    { name: 'Tonkatsu Ramen chicken 鸡扒', price: 23.80, description: 'Tonkatsu ramen with chicken, bamboo shoots, black fungus, spring onion, and marinated egg.' },
    { name: 'Tonkatsu Ramen pork 猪扒', price: 23.80, description: 'Tonkatsu ramen with pork, bamboo shoots, black fungus, spring onion, and marinated egg.' },
    { name: 'Wagyu Beef ramen', price: 26.50, description: 'Wagyu beef ramen with bamboo shoots, black fungus, spring onion, and marinated egg.' },
    { name: 'Chicken Ramen', price: 23.80, description: 'Chicken ramen with bamboo shoots, black fungus, spring onion, and marinated egg.' },
    { name: 'Pork Ramen', price: 23.80, description: 'Pork ramen with bamboo shoots, black fungus, spring onion, and marinated egg.' },
    { name: 'Signature Spicy Ramen', price: 26.50, description: 'Spicy ramen with bamboo shoots, black fungus, spring onion, and marinated egg.', tags: ['spicy'] },
    { name: 'Tantan Spicy Pork Mince Ramen Dry', price: 23.80, description: 'Dry tantan ramen with spicy pork mince and ramen toppings.', tags: ['spicy'] },
    { name: 'Tantan Spicy Pork Mince Ramen Soup', price: 23.80, description: 'Soup tantan ramen with spicy pork mince and ramen toppings.', tags: ['spicy'] },
    { name: 'Spicy Beef Ramen', price: 23.80, description: 'Spicy beef ramen with bamboo shoots, black fungus, spring onion, and marinated egg.', tags: ['spicy'] },
    { name: 'Yasai Ramen', price: 23.80, description: 'Vegetable ramen with broccoli, corn, bamboo shoots, wood fungus, spring onion, pickle, and seaweed.', tags: ['vegetarian'] },
    { name: 'Extra Ramen Soup', price: 4.00, description: 'Extra ramen soup.' },
    { name: 'Plain Ramen with soup', price: 13.40, description: 'Plain ramen served with soup.' },
  ],
  'Udon noodle soup': [
    { name: 'Tonkatsu Udon chicken 鸡扒', price: 23.80, description: 'Tonkatsu udon with chicken, seaweed, fish cake, spring onion, and mushroom.' },
    { name: 'Tonkatsu Udon pork 猪扒', price: 23.80, description: 'Tonkatsu udon with pork, seaweed, fish cake, spring onion, and mushroom.' },
    { name: 'Chicken Udon', price: 23.40, description: 'Udon noodle soup with chicken and classic udon toppings.' },
    { name: 'Pork Udon', price: 23.40, description: 'Udon noodle soup with pork and classic udon toppings.' },
    { name: 'Spicy Beef Udon', price: 23.40, description: 'Udon noodle soup with spicy beef and classic udon toppings.', tags: ['spicy'] },
    { name: 'Tempura Udon', price: 24.70, description: 'Udon noodle soup served with tempura and classic udon toppings.' },
    { name: 'Yasai Udon', price: 23.40, description: 'Vegetable udon with broccoli, corn, bamboo shoots, wood fungus, spring onion, pickle, and seaweed.', tags: ['vegetarian'] },
    { name: 'Inari Udon', price: 23.40, description: 'Udon noodle soup with inari and classic udon toppings.' },
    { name: 'Plain Udon with soup', price: 13.40, description: 'Plain udon served with soup.' },
    { name: 'Wagyu Beef Udon', price: 27.80, description: 'Udon noodle soup with wagyu beef.' },
    { name: 'Extra Udon soup', price: 4.00, description: 'Extra udon soup.' },
  ],
  'Bento': [
    { name: 'Teriyaki Chicken Bento', price: 29.60, description: 'Bento with rice, seaweed salad, sushi, onsen egg, karaage chicken, miso soup, and salad.' },
    { name: 'Salmon Sashimi Bento', price: 32.20, description: 'Bento with salmon sashimi, rice, seaweed salad, sushi, onsen egg, miso soup, and salad.' },
    { name: 'Teriyaki Tofu Bento (V)', price: 29.60, description: 'Vegetarian bento with teriyaki tofu, rice, seaweed salad, sushi, spring roll, croquette, miso soup, and salad.', tags: ['vegetarian'] },
    { name: 'Wagyu Beef Bento', price: 32.20, description: 'Bento with wagyu beef, rice, seaweed salad, sushi, onsen egg, karaage chicken, miso soup, and salad.' },
    { name: 'Teriyaki Salmon Bento Teriyaki', price: 32.20, description: 'Bento with teriyaki salmon, rice, seaweed salad, sushi, onsen egg, miso soup, and salad.' },
    { name: 'Spicy Beef Bento', price: 29.60, description: 'Bento with spicy beef, rice, seaweed salad, sushi, onsen egg, karaage chicken, miso soup, and salad.', tags: ['spicy'] },
    { name: 'Katsu Bento chicken 鸡扒', price: 29.60, description: 'Bento with chicken katsu, rice, seaweed salad, sushi, onsen egg, karaage chicken, miso soup, and salad.' },
    { name: 'Katsu Bento pork 猪扒', price: 29.60, description: 'Bento with pork katsu, rice, seaweed salad, sushi, onsen egg, karaage chicken, miso soup, and salad.' },
    { name: 'Katsu Bento Veggie 素', price: 29.60, description: 'Vegetarian-style katsu bento with rice, seaweed salad, sushi, miso soup, and salad.', tags: ['vegetarian'] },
  ],
  'Entrée': [
    { name: 'Miso Soup', price: 6.30, description: 'Miso soup with spring onion, seaweed, and tofu.', tags: ['vegetarian'] },
    { name: 'Edamame (V)', price: 6.30, description: 'Steamed edamame beans.', tags: ['vegetarian', 'gf'] },
    { name: 'Seaweed Salad', price: 7.90, description: 'Seaweed salad.', tags: ['vegetarian', 'gf'] },
    { name: 'Harumaki (V) 2pc', price: 8.90, description: 'Two vegetarian spring rolls.', tags: ['vegetarian'] },
    { name: 'Umami Fried (V)', price: 6.80, description: 'Fried vegetarian umami snack.', tags: ['vegetarian'] },
    { name: 'Agedashi Tofu (V)', price: 9.50, description: 'Fried tofu served in agedashi style.', tags: ['vegetarian'] },
    { name: 'Takoyaki 6pc', price: 9.50, description: 'Six pieces of takoyaki.' },
    { name: 'Yasai Croquette (V) 2pc veg', price: 9.50, description: 'Two vegetarian yasai croquettes.', tags: ['vegetarian'] },
    { name: 'Vegetarian Pancake 2p', price: 13.80, description: 'Two vegetarian pancakes.', tags: ['vegetarian'] },
    { name: 'Okonomiyaki', price: 9.50, description: 'Japanese-style savoury pancake.' },
    { name: 'Gyoza 6pcs pork 猪', price: 14.20, description: 'Six pork gyoza.' },
    { name: 'Gyoza 6pcs veg 素', price: 14.20, description: 'Six vegetable gyoza.', tags: ['vegetarian'] },
    { name: 'Gyoza 6pcs mix 混合', price: 14.20, description: 'Six mixed gyoza.' },
    { name: 'Chicken Karaage', price: 11.60, description: 'Japanese fried chicken.' },
    { name: 'Tempura 5p Prawn', price: 16.80, description: 'Five pieces of prawn tempura.' },
    { name: 'Tempura 8p Veggie', price: 16.80, description: 'Eight pieces of vegetable tempura.', tags: ['vegetarian'] },
    { name: 'Tempura 3pwn/4veg', price: 16.80, description: 'Mixed tempura with three prawn and four vegetable pieces.' },
    { name: 'Katsu chicken 鸡扒', price: 13.10, description: 'Chicken katsu.' },
    { name: 'Katsu pork 猪扒', price: 13.10, description: 'Pork katsu.' },
    { name: 'Sesame Prawn Toast 2p', price: 13.80, description: 'Two pieces of sesame prawn toast.' },
    { name: 'Deep Fried DimSim 2pc', price: 7.40, description: 'Two deep-fried dim sims.' },
    { name: 'Age mochi 4pc', price: 12.90, description: 'Four pieces of fried mochi.' },
  ],
  'Platter': [
    { name: 'Platter No.1 Mini (80pcs) + Seaweed Salad', price: 72.00, description: 'Mini sushi platter with 80 pieces and seaweed salad.' },
    { name: 'Platter No.2 Mini (96pcs) + Seaweed Salad', price: 78.00, description: 'Mini sushi platter with 96 pieces and seaweed salad.' },
    { name: 'Platter No.3 Mini (112pcs) + Seaweed Salad', price: 84.00, description: 'Mini sushi platter with 112 pieces and seaweed salad.' },
    { name: 'Platter No.5 InsideOut (48pcs) + Seaweed Salad', price: 87.00, description: 'Inside-out roll platter with 48 pieces and seaweed salad.' },
    { name: 'Platter No.6 InsideOut (56pcs) + Seaweed Salad', price: 97.50, description: 'Inside-out roll platter with 56 pieces and seaweed salad.' },
    { name: 'Platter No.7 Nigiri (24pcs) + Seaweed Salad', price: 63.00, description: 'Nigiri platter with 24 pieces and seaweed salad.' },
    { name: 'Platter No.8 Assorted (30pcs) + Seaweed Salad', price: 67.50, description: 'Assorted sushi platter with 30 pieces and seaweed salad.' },
    { name: 'Platter No.9 Aburi Nigiri (24pcs) + Seaweed Salad', price: 82.50, description: 'Aburi nigiri platter with 24 pieces and seaweed salad.' },
    { name: 'Platter No.10 Signature (26pcs) Chicken', price: 48.00, description: 'Signature 26-piece chicken sushi platter.' },
    { name: 'Platter No.10 Signature (26pcs) Tuna', price: 48.00, description: 'Signature 26-piece tuna sushi platter.' },
    { name: 'Platter No.10 Signature (26pcs) Prawn', price: 52.50, description: 'Signature 26-piece prawn sushi platter.' },
    { name: 'Platter No.10 Signature (26pcs) Salmon', price: 57.00, description: 'Signature 26-piece salmon sushi platter.' },
    { name: 'Platter No.11 Combo (50pc)', price: 57.00, description: 'Combo sushi platter with 50 pieces.' },
  ],
  'Hand Roll U': [
    { name: 'Avocado Cucumber Roll (V)(GF)', price: 4.90, description: 'Hand roll with avocado and cucumber.', tags: ['vegetarian', 'gf'] },
    { name: 'Plain Avocado Roll(V)(GF)', price: 4.90, description: 'Hand roll with plain avocado.', tags: ['vegetarian', 'gf'] },
    { name: 'Kakiage Veg Roll (Tempura Veg)', price: 4.90, description: 'Hand roll with kakiage tempura vegetables.', tags: ['vegetarian'] },
    { name: 'Vegetarian Roll(V)(GF)', price: 4.90, description: 'Vegetarian gluten-free hand roll.', tags: ['vegetarian', 'gf'] },
    { name: 'Tofu Cucumber Roll(V)(GF)', price: 4.90, description: 'Hand roll with tofu and cucumber.', tags: ['vegetarian', 'gf'] },
    { name: 'Salmon Avocado Roll (GF)', price: 6.50, description: 'Gluten-free hand roll with salmon and avocado.', tags: ['gf'] },
    { name: 'Teriyaki Salmon Roll', price: 6.50, description: 'Hand roll with teriyaki salmon.' },
    { name: 'Spicy Fresh Tuna Roll (GF)', price: 6.50, description: 'Gluten-free hand roll with spicy fresh tuna.', tags: ['gf', 'spicy'] },
    { name: 'Spicy Beef Roll', price: 6.20, description: 'Hand roll with spicy beef.', tags: ['spicy'] },
    { name: 'Tempura Prawn Roll', price: 6.20, description: 'Hand roll with tempura prawn.' },
    { name: 'Prawn Avocado Roll(GF)', price: 6.20, description: 'Gluten-free hand roll with prawn and avocado.', tags: ['gf'] },
    { name: 'Spicy Prawn Avocado Roll (GF)', price: 6.20, description: 'Gluten-free hand roll with spicy prawn and avocado.', tags: ['gf', 'spicy'] },
    { name: 'Crispy Chicken Cucumber Roll', price: 5.50, description: 'Hand roll with crispy chicken and cucumber.' },
    { name: 'California Roll', price: 5.50, description: 'California-style hand roll.' },
    { name: 'Crispy Chicken Avocado Roll', price: 5.50, description: 'Hand roll with crispy chicken and avocado.' },
    { name: 'Teriyaki Chicken Cucumber Roll', price: 5.50, description: 'Hand roll with teriyaki chicken and cucumber.' },
    { name: 'Teriyaki Chicken Avocado Roll', price: 5.50, description: 'Hand roll with teriyaki chicken and avocado.' },
    { name: 'Tuna Salad Cucumber Roll (GF)', price: 5.50, description: 'Gluten-free hand roll with tuna salad and cucumber.', tags: ['gf'] },
    { name: 'Tuna Salad Avocado Roll (GF)', price: 5.50, description: 'Gluten-free hand roll with tuna salad and avocado.', tags: ['gf'] },
    { name: 'Spicy Tuna Cucumber Roll (GF)', price: 5.50, description: 'Gluten-free hand roll with spicy tuna and cucumber.', tags: ['gf', 'spicy'] },
    { name: 'Spicy Tuna Avocado Roll (GF)', price: 5.50, description: 'Gluten-free hand roll with spicy tuna and avocado.', tags: ['gf', 'spicy'] },
    { name: 'Spicy Chicken lettuce Roll', price: 5.50, description: 'Hand roll with spicy chicken and lettuce.', tags: ['spicy'] },
  ],
}

const SUSHI_BOX_ITEMS: MenuItemSeed[] = [
  { name: 'Seaweed Salad', price: 7.90, description: 'Seaweed salad.', tags: ['vegetarian', 'gf'] },
  { name: 'Salmon Sashimi', price: 17.90, description: 'Salmon sashimi.', tags: ['gf'] },
  { name: 'Mix Sashimi', price: 20.60, description: 'Mixed sashimi box.', tags: ['gf'] },
  { name: 'Grill Chicken Salad', price: 14.70, description: 'Salad topped with grilled chicken.' },
  { name: 'Seafood Salad', price: 14.70, description: 'Salad topped with seafood.' },
  { name: 'Salmon Salad', price: 17.40, description: 'Salad topped with salmon.' },
  { name: 'Mix Salad', price: 17.40, description: 'Mixed salad box.' },
  { name: 'Salmon Nigiri Box 6pc', price: 15.20, description: 'Six-piece salmon nigiri box.' },
  { name: 'Salmon & Tuna Nigiri 6pc', price: 15.20, description: 'Six-piece salmon and tuna nigiri box.' },
  { name: 'Salmon & Prawn Nigiri Box 6pc', price: 15.20, description: 'Six-piece salmon and prawn nigiri box.' },
  { name: 'Prawn Nigiri Box 6pc', price: 15.20, description: 'Six-piece prawn nigiri box.' },
  { name: 'Tuna Nigiri Box 6pc', price: 15.20, description: 'Six-piece tuna nigiri box.' },
  { name: 'Assorted Sushi Box', price: 25.50, description: 'Assorted sushi box.' },
  { name: 'Salmon Delight Box', price: 25.50, description: 'Salmon delight sushi box.' },
  { name: 'Deluxe Box', price: 25.50, description: 'Deluxe sushi box.' },
  { name: 'Tuna InsideOut Roll Box 10pc(GF)(B)', price: 19.30, description: 'Ten-piece tuna inside-out roll box.', tags: ['gf'] },
  { name: 'Crispy Chicken InsideOut Roll Box 10pc(B)', price: 19.30, description: 'Ten-piece crispy chicken inside-out roll box.' },
  { name: 'California InsideOut Roll Box 10pc(B)', price: 19.30, description: 'Ten-piece California inside-out roll box.' },
  { name: 'Tempura Prawn InsideOut Roll Box 10pc(B)', price: 19.30, description: 'Ten-piece tempura prawn inside-out roll box.' },
  { name: 'Teriyaki Chicken InsideOut Roll Box 10pc(B)', price: 19.30, description: 'Ten-piece teriyaki chicken inside-out roll box.' },
  { name: 'Tuna With Mayo&Teriyaki Sauce InsideOut Box 10pc(S)', price: 13.80, description: 'Ten-piece tuna inside-out roll box with mayo and teriyaki sauce.' },
  { name: 'Crispy Chicken With Mayo&Teriyaki Sauce InsideOut Box 10pc(S)', price: 13.80, description: 'Ten-piece crispy chicken inside-out roll box with mayo and teriyaki sauce.' },
  { name: 'California With Mayo InsideOut Box 10pc(S)', price: 13.80, description: 'Ten-piece California inside-out roll box with mayo.' },
  { name: 'Panko Prawn With Mayo InsideOut Box 10pc(S)', price: 13.80, description: 'Ten-piece panko prawn inside-out roll box with mayo.' },
  { name: 'Teriyaki Chicken With Mayo&Teriyaki Sauce InsideOut Box 10pc(S)', price: 13.80, description: 'Ten-piece teriyaki chicken inside-out roll box with mayo and teriyaki sauce.' },
  { name: 'Chicken With Sweet Chili Mayo Combo Box', price: 14.70, description: 'Chicken combo box with sweet chili mayo.' },
  { name: 'Panko Prawn With Sweet Chili Mayo Combo Box', price: 14.70, description: 'Panko prawn combo box with sweet chili mayo.' },
  { name: 'Kakiage Veg With Sweet Chili Combo Box', price: 14.70, description: 'Kakiage vegetable combo box with sweet chili.', tags: ['vegetarian'] },
  { name: 'Salmon Tobiki Roll Box 10pc', price: 22.80, description: 'Ten-piece salmon tobiki roll box.' },
  { name: 'Aburi Salmon Nigiri Box 6pc', price: 17.90, description: 'Six-piece aburi salmon nigiri box.' },
  { name: 'Aburi Prawn Nigiri Box 6pc', price: 17.90, description: 'Six-piece aburi prawn nigiri box.' },
  { name: 'Aburi Spicy Crab Nigiri Box 6pc', price: 17.90, description: 'Six-piece aburi spicy crab nigiri box.', tags: ['spicy'] },
  { name: 'Tobiki Nigiri Box 6pc', price: 21.40, description: 'Six-piece tobiki nigiri box.' },
  { name: 'Chicken Katsu Nigiri box 6p', price: 20.10, description: 'Six-piece chicken katsu nigiri box.' },
  { name: 'Panko Prawn Nigiri Box 6pc', price: 20.10, description: 'Six-piece panko prawn nigiri box.' },
  { name: 'Kakiage Veg Nigiri Box 6pc', price: 16.60, description: 'Six-piece kakiage vegetable nigiri box.', tags: ['vegetarian'] },
  { name: 'Plain Inari Box 6pc', price: 16.00, description: 'Six-piece plain inari box.', tags: ['vegetarian'] },
  { name: 'Seaweed Inari Box 4pc', price: 13.60, description: 'Four-piece seaweed inari box.', tags: ['vegetarian'] },
  { name: 'Crabstick Salad Inari Box 4pc', price: 13.80, description: 'Four-piece crabstick salad inari box.' },
  { name: 'Tuna Inari Box 4pc', price: 13.80, description: 'Four-piece tuna inari box.' },
  { name: 'Kakiage Veg Inari Box 4pc', price: 13.80, description: 'Four-piece kakiage vegetable inari box.', tags: ['vegetarian'] },
  { name: 'Tuna Mini Roll Box 16pc', price: 13.30, description: 'Sixteen-piece tuna mini roll box.' },
  { name: 'Chicken Mini Roll Box 16pc', price: 13.30, description: 'Sixteen-piece chicken mini roll box.' },
  { name: 'Mix Mini Roll Box 16pc', price: 13.30, description: 'Sixteen-piece mixed mini roll box.' },
  { name: 'Salmon Mini Roll Box 16pc', price: 14.70, description: 'Sixteen-piece salmon mini roll box.' },
  { name: 'Cucumber Mini Roll Box 16pc', price: 13.30, description: 'Sixteen-piece cucumber mini roll box.', tags: ['vegetarian', 'gf'] },
  { name: 'Avocado Mini Roll Box 16pc', price: 13.30, description: 'Sixteen-piece avocado mini roll box.', tags: ['vegetarian', 'gf'] },
  { name: 'Salmon Belly Sashimi', price: 25.50, description: 'Salmon belly sashimi.', tags: ['gf'] },
]

const DRINKS_ITEMS: MenuItemSeed[] = [
  { name: 'Water 600ml', price: 4.10, description: '600ml bottled water.' },
  { name: 'Sparkling Water', price: 5.40, description: 'Bottled sparkling water.' },
  { name: 'Pepsi 600ml', price: 6.10, description: '600ml Pepsi.' },
  { name: 'Pepsi Max 600ml', price: 6.10, description: '600ml Pepsi Max.' },
  { name: 'Solo 600ml', price: 6.10, description: '600ml Solo drink.' },
  { name: 'Sunkist 600ml', price: 6.10, description: '600ml Sunkist drink.' },
  { name: 'Moutain Dew 600ml', price: 6.10, description: '600ml Mountain Dew.' },
  { name: '7 Up 600ml', price: 6.10, description: '600ml 7 Up.' },
  { name: 'Passional 600ml', price: 6.10, description: '600ml Passiona drink.' },
  { name: 'Peach No Sugar Active Gatorade', price: 7.10, description: 'Peach no-sugar Active Gatorade.' },
  { name: 'Blue Bolt Gatorade 600ml', price: 7.10, description: '600ml Blue Bolt Gatorade.' },
  { name: 'gatorade berry', price: 7.10, description: 'Berry-flavoured Gatorade.' },
  { name: 'Fash Twitch - Cool Blue 350ml', price: 6.80, description: '350ml Fast Twitch Cool Blue drink.' },
  { name: 'Fash Twitch - Strawberry Lemonade 350ml', price: 6.80, description: '350ml Fast Twitch Strawberry Lemonade drink.' },
  { name: 'Apple Juice Pop Tops 250ml', price: 4.80, description: '250ml Pop Tops apple juice.' },
  { name: 'Orange Juice Pop Tops 250ml', price: 4.80, description: '250ml Pop Tops orange juice.' },
  { name: 'Solo Energy Lemon No Sugar 500ml', price: 8.10, description: '500ml no-sugar Solo Energy Lemon.' },
  { name: 'Solo Energy Lemon 500ml', price: 8.10, description: '500ml Solo Energy Lemon.' },
  { name: 'Fuji Apple Sparklin Pokak 325ml', price: 5.70, description: '325ml Fuji apple sparkling Pokka drink.' },
  { name: 'All Press Espresso', price: 8.10, description: 'Bottled All Press Espresso.' },
  { name: 'Agrum Blood Orange Schweppes 300ml', price: 5.70, description: '300ml Schweppes Agrum Blood Orange.' },
  { name: 'Original Aloe Vera 490ml', price: 5.40, description: '490ml original aloe vera drink.' },
  { name: 'Lychee Aloe Vera 490ml', price: 5.40, description: '490ml lychee aloe vera drink.' },
  { name: 'original Ramune (Japanese Beverages) 200ml', price: 5.70, description: '200ml original Japanese ramune.' },
  { name: 'Blue Hawaii Ramune (Japanese Beverages) 200ml', price: 5.70, description: '200ml Blue Hawaii Japanese ramune.' },
  { name: 'Melon Ramune (Japanese Beverages) 200ml', price: 5.70, description: '200ml melon Japanese ramune.' },
  { name: 'Peach Ramune (Japanese Beverages) 200ml', price: 5.70, description: '200ml peach Japanese ramune.' },
  { name: 'Orange Juice Spring Valley 300ml', price: 6.10, description: '300ml Spring Valley orange juice.' },
  { name: 'Pepsi Max Can 325ml', price: 4.10, description: '325ml Pepsi Max can.' },
  { name: 'Strawberry Lipton 500ml', price: 6.80, description: '500ml strawberry Lipton iced tea.' },
  { name: 'Lemon Ice Tea Lipton 500ml', price: 6.80, description: '500ml lemon Lipton iced tea.' },
  { name: 'Peach Ice Tea Lipton 500ml', price: 6.80, description: '500ml peach Lipton iced tea.' },
  { name: 'No sugar Lemon Ice Tea Lipton 500ml', price: 6.80, description: '500ml no-sugar lemon Lipton iced tea.' },
  { name: 'No Sugar Peach Ice Tea Lipton 500ml', price: 6.80, description: '500ml no-sugar peach Lipton iced tea.' },
  { name: 'Hot Brown Rice Green Tea p/person', price: 4.10, description: 'Hot brown rice green tea per person.' },
]

const SAUCE_ITEMS: MenuItemSeed[] = [
  { name: 'Chili Oil (home made)', price: 1.50, description: 'Homemade chili oil.', tags: ['spicy', 'vegetarian', 'gf'] },
  { name: 'Shichimi (Assorted chili pepper)', price: 1.50, description: 'Assorted Japanese chili pepper.', tags: ['spicy', 'vegetarian', 'gf'] },
  { name: 'Teriyaki + Mayonnaise (home made)', price: 1.50, description: 'Homemade teriyaki sauce mixed with mayonnaise.' },
  { name: 'Teriyaki Sauce (home made)', price: 1.50, description: 'Homemade teriyaki sauce.', tags: ['vegetarian'] },
  { name: 'Mayonnaise', price: 1.50, description: 'Mayonnaise sauce.', tags: ['vegetarian', 'gf'] },
  { name: 'Spicy Mayonnaise', price: 1.50, description: 'Spicy mayonnaise sauce.', tags: ['spicy', 'vegetarian', 'gf'] },
  { name: 'Sweet Chili Mayonnaise', price: 1.50, description: 'Sweet chili mayonnaise sauce.', tags: ['vegetarian', 'gf'] },
  { name: 'Sesame Dressing', price: 1.50, description: 'Sesame dressing sauce.', tags: ['vegetarian', 'gf'] },
  { name: 'Sweet Chili', price: 1.50, description: 'Sweet chili sauce.', tags: ['vegetarian', 'gf'] },
  { name: 'Katsu Sauce (home made)', price: 1.50, description: 'Homemade katsu sauce.', tags: ['vegetarian'] },
  { name: 'Katsu + Mayonnaise (home made)', price: 1.50, description: 'Homemade katsu sauce mixed with mayonnaise.' },
  { name: 'Ginger', price: 1.50, description: 'Pickled ginger.', tags: ['vegetarian', 'gf'] },
  { name: 'Red Pickle', price: 1.50, description: 'Red pickles.', tags: ['vegetarian', 'gf'] },
  { name: 'Wasabi', price: 0.00, description: 'Wasabi condiment.', tags: ['vegetarian', 'gf'] },
]

MENU_ITEMS['Sushi Box U'] = SUSHI_BOX_ITEMS
MENU_ITEMS['Drinks U'] = DRINKS_ITEMS
MENU_ITEMS['Sauce'] = SAUCE_ITEMS

async function seed() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // Clear existing data
  await Category.deleteMany({})
  await MenuItem.deleteMany({})
  await User.deleteMany({})
  console.log('Cleared existing data')

  // Seed categories
  const categoryMap: Record<string, mongoose.Types.ObjectId> = {}
  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name)
    const created = await Category.create({ ...cat, slug, isActive: true })
    categoryMap[cat.name] = created._id
    console.log(`Created category: ${cat.name}`)
  }

  // Seed menu items
  let itemCount = 0
  for (const [catName, items] of Object.entries(MENU_ITEMS)) {
    const categoryId = categoryMap[catName]
    if (!categoryId) {
      console.warn(`Category not found: ${catName}`)
      continue
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let slug = slugify(item.name)
      const existing = await MenuItem.findOne({ slug })
      if (existing) slug = `${slug}-${Date.now()}-${i}`
      await MenuItem.create({
        ...item,
        slug,
        categoryId,
        isAvailable: true,
        isPopular: false,
        popularOverride: 'auto',
        orderCount: 0,
        sortOrder: i,
        tags: item.tags ?? [],
      })
      itemCount++
    }
    console.log(`Seeded ${items.length} items for: ${catName}`)
  }

  // Seed admin user
  const adminName = process.env.ADMIN_NAME ?? 'Admin'
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@watami.com.au'
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin@123456'
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await User.create({
    name: adminName,
    email: adminEmail,
    passwordHash,
    role: 'admin',
    status: 'active',
  })
  console.log(`Created admin user: ${adminEmail}`)

  console.log(`\nSeed complete! ${CATEGORIES.length} categories, ${itemCount} menu items, 1 admin user`)
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
