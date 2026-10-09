const { run, all, get } = require('./db');

async function createTables() {
  await run(`CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    image TEXT,
    category TEXT DEFAULT 'all'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    created_at TEXT,
    updated_at TEXT
  )`);

  await run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT,
    created_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT,
    phone TEXT,
    date TEXT,
    time TEXT,
    party_size INTEGER,
    status TEXT,
    created_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    total REAL,
    status TEXT,
    created_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    menu_id INTEGER,
    menu_name TEXT,
    quantity INTEGER,
    price REAL,
    FOREIGN KEY(order_id) REFERENCES orders(id),
    FOREIGN KEY(menu_id) REFERENCES menu(id)
  )`);
}

async function ensurePaymentIdColumns() {
  try {
    await run('ALTER TABLE reservations ADD COLUMN payment_id TEXT');
  } catch (err) {
    // ignore if column already exists
  }
  try {
    await run('ALTER TABLE orders ADD COLUMN payment_id TEXT');
  } catch (err) {
    // ignore if column already exists
  }
  try {
    await run('ALTER TABLE menu ADD COLUMN category TEXT DEFAULT "all"');
  } catch (err) {
    // ignore if column already exists
  }
}

async function seedMenuIfEmpty() {
  const allItems = [
    // Fast Food & Pizzas
    { id: 1, name: 'Margherita Pizza', description: 'Fresh tomato & mozzarella', price: 250, category: 'fast_food' },
    { id: 4, name: 'Garlic Bread', description: 'Crispy & buttery', price: 80, category: 'fast_food' },
    { id: 5, name: 'Chocolate Brownie', description: 'Rich & fudgy', price: 120, category: 'fast_food' },
    { id: 9, name: 'French Fries', description: 'Crispy fries', price: 80, category: 'fast_food' },
    { id: 10, name: 'Gobi Manchurian', description: 'Spicy cauliflower', price: 120, category: 'fast_food' },
    { id: 11, name: 'Chicken 65', description: 'Crispy spicy chicken', price: 160, category: 'fast_food' },
    
    // Veg
    { id: 2, name: 'Paneer Butter Masala', description: 'Creamy & aromatic', price: 220, category: 'veg' },
    { id: 3, name: 'Veg Biryani', description: 'Fragrant basmati rice', price: 180, category: 'veg' },
    { id: 6, name: 'Veg Soup', description: 'Warm vegetable soup', price: 70, category: 'veg' },
    { id: 7, name: 'Tomato Soup', description: 'Classic tomato soup', price: 60, category: 'veg' },
    { id: 12, name: 'Paneer Tikka', description: 'Grilled paneer cubes', price: 150, category: 'veg' },
    { id: 13, name: 'Veg Kurma', description: 'Coconut-based veg kurma', price: 120, category: 'veg' },
    { id: 14, name: 'Dal Tadka', description: 'Yellow lentils tempered', price: 110, category: 'veg' },
    { id: 15, name: 'Mushroom Masala', description: 'Spiced mushroom curry', price: 150, category: 'veg' },
    { id: 16, name: 'Veg Biryani (Small)', description: 'Aromatic veg biryani', price: 140, category: 'veg' },
    { id: 17, name: 'Veg Fried Rice', description: 'Stir-fried veg rice', price: 130, category: 'veg' },
    
    // Breads & Rotis
    { id: 8, name: 'Chicken Soup', description: 'Comforting chicken soup', price: 90, category: 'breads' },
    { id: 18, name: 'Chapati', description: 'Whole wheat chapati', price: 15, category: 'breads' },
    { id: 19, name: 'Butter Naan', description: 'Buttery naan', price: 40, category: 'breads' },
    { id: 20, name: 'Garlic Naan', description: 'Naan with garlic', price: 55, category: 'breads' },
    { id: 21, name: 'Tandoori Roti', description: 'Tandoor-roasted roti', price: 25, category: 'breads' },
    { id: 22, name: 'Paratha', description: 'Layered flatbread', price: 35, category: 'breads' }
  ];

  // Insert missing items
  for (const it of allItems) {
    const exists = await get('SELECT id FROM menu WHERE id = ?', [it.id]);
    if (!exists) {
      await run('INSERT INTO menu (id, name, description, price, image, category) VALUES (?,?,?,?,?,?)',
        [it.id, it.name, it.description || '', it.price || 0, '', it.category || 'all']);
      console.log('[MENU] Inserted item', it.id, it.name, 'in category:', it.category);
    }
  }
  console.log('Menu synchronized with all items');
}

async function main() {
  try {
    await createTables();
    await ensurePaymentIdColumns(); // <- ensure columns exist
    await seedMenuIfEmpty();
    console.log('Database initialized.');
  } catch (err) {
    console.error('Failed to initialize DB:', err);
    process.exit(1);
  }
}

main();
