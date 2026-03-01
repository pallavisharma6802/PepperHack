/**
 * mockDishes.js — P4 demo data.
 * Rich dish objects matching backend/schema.py Dish shape.
 * Used by MenuDisplay's "⚗ Demo" button in DEV mode.
 *
 * Intentionally covers every UI path:
 *   • must_try + must_try_reason  → badge + quote card
 *   • macros.confidence 'low'     → ~ prefix on all values
 *   • allergens []                → allergen pills in DishCard
 *   • photo_url                   → dish-develop blur animation
 *   • all 5 categories            → category tabs exercise
 */
export const MOCK_DISHES = [
  // ── Starters ───────────────────────────────────────────────────────────────
  {
    id: 'dish_truffle_fries',
    name: 'Truffle Fries',
    category: 'Starters',
    description: 'Hand-cut fries tossed in black truffle oil, shaved parmesan, fresh rosemary, Maldon salt.',
    price: '$12',
    photo_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=80',
    must_try: true,
    must_try_reason: 'Our #1 ordered dish for 3 years running — the truffle oil is sourced directly from Umbria.',
    allergens: ['Gluten', 'Dairy'],
    macros: { calories: 420, protein_g: 8, carbs_g: 52, fat_g: 22, confidence: 'high' },
  },
  {
    id: 'dish_burrata',
    name: 'Burrata',
    category: 'Starters',
    description: 'Fresh burrata, heirloom tomatoes, basil oil, cracked pepper, grilled sourdough crostini.',
    price: '$16',
    photo_url: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&q=80',
    must_try: false,
    allergens: ['Dairy', 'Gluten'],
    macros: { calories: 310, protein_g: 14, carbs_g: 18, fat_g: 21, confidence: 'high' },
  },
  {
    id: 'dish_cheese_board',
    name: 'Wisconsin Cheese Board',
    category: 'Starters',
    description: 'Four local Wisconsin cheeses, honeycomb, candied walnuts, fig jam, house-made crostini.',
    price: '$22',
    photo_url: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400&q=80',
    must_try: true,
    must_try_reason: "Celebrating what Wisconsin does best — every cheese is sourced within 50 miles of Madison.",
    allergens: ['Dairy', 'Gluten', 'Nuts'],
    macros: { calories: 580, protein_g: 24, carbs_g: 36, fat_g: 38, confidence: 'low' },
  },

  // ── Mains ──────────────────────────────────────────────────────────────────
  {
    id: 'dish_duck_confit',
    name: 'Duck Confit',
    category: 'Mains',
    description: 'Slow-braised duck leg, crispy rendered skin, Puy lentils, cherry gastrique, microgreens.',
    price: '$34',
    photo_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400&q=80',
    must_try: true,
    must_try_reason: "Chef braises for 48 hours. Madison Magazine called it 'the best duck in the city.'",
    allergens: [],
    macros: { calories: 680, protein_g: 48, carbs_g: 22, fat_g: 44, confidence: 'high' },
  },
  {
    id: 'dish_mushroom_risotto',
    name: 'Wild Mushroom Risotto',
    category: 'Mains',
    description: 'Carnaroli rice, chanterelles, porcini broth, aged parmesan, white truffle oil finish.',
    price: '$28',
    photo_url: 'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400&q=80',
    must_try: false,
    allergens: ['Dairy'],
    macros: { calories: 540, protein_g: 16, carbs_g: 68, fat_g: 22, confidence: 'high' },
  },
  {
    id: 'dish_salmon',
    name: 'Seared King Salmon',
    category: 'Mains',
    description: 'Line-caught Pacific salmon, celery root purée, pickled fennel, dill beurre blanc.',
    price: '$36',
    photo_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80',
    must_try: false,
    allergens: ['Shellfish', 'Dairy'],
    macros: { calories: 490, protein_g: 42, carbs_g: 14, fat_g: 28, confidence: 'high' },
  },

  // ── Desserts ───────────────────────────────────────────────────────────────
  {
    id: 'dish_lava_cake',
    name: 'Chocolate Lava Cake',
    category: 'Desserts',
    description: 'Warm Valrhona chocolate fondant, vanilla bean ice cream, raspberry coulis, cocoa dust.',
    price: '$14',
    photo_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&q=80',
    must_try: false,
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    macros: { calories: 620, protein_g: 10, carbs_g: 74, fat_g: 34, confidence: 'high' },
  },
  {
    id: 'dish_panna_cotta',
    name: 'Vanilla Panna Cotta',
    category: 'Desserts',
    description: 'Silky vanilla bean cream, seasonal berry compote, almond tuile, candied lemon zest.',
    price: '$12',
    photo_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&q=80',
    must_try: false,
    allergens: ['Dairy', 'Nuts'],
    macros: { calories: 340, protein_g: 6, carbs_g: 38, fat_g: 18, confidence: 'low' },
  },

  // ── Drinks ─────────────────────────────────────────────────────────────────
  {
    id: 'dish_old_fashioned',
    name: 'Merchant Old Fashioned',
    category: 'Drinks',
    description: "Bulleit rye, demerara syrup, Angostura & Peychaud's bitters, orange peel, single cube.",
    price: '$15',
    photo_url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&q=80',
    must_try: false,
    allergens: [],
    macros: { calories: 180, protein_g: 0, carbs_g: 12, fat_g: 0, confidence: 'high' },
  },
]
