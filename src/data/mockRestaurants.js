/**
 * Mock restaurants for development when backend isn't ready.
 * Matches schema: id, name, cuisine, address, lat, lng, rating, photo_url, is_open, price_level
 */
export const MOCK_RESTAURANTS = [
  {
    id: '1',
    name: 'Merchant',
    cuisine: 'Gastropub',
    address: 'State Street, Madison',
    lat: 43.0731,
    lng: -89.4012,
    rating: 4.7,
    photo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
    is_open: true,
    price_level: 2,
    distance: '0.3 mi',
  },
  {
    id: '2',
    name: 'Graze',
    cuisine: 'Farm-to-Table',
    address: 'Capitol Square, Madison',
    lat: 43.0735,
    lng: -89.4015,
    rating: 4.8,
    photo_url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
    is_open: true,
    price_level: 3,
    distance: '0.5 mi',
  },
  {
    id: '3',
    name: 'Nostrano',
    cuisine: 'Italian',
    address: 'Madison',
    lat: 43.0725,
    lng: -89.4018,
    rating: 4.6,
    photo_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
    is_open: false,
    price_level: 3,
    distance: '0.8 mi',
  },
  {
    id: '4',
    name: 'Forequarter',
    cuisine: 'Eclectic',
    address: 'Madison',
    lat: 43.0728,
    lng: -89.4008,
    rating: 4.9,
    photo_url: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=600&q=80',
    is_open: true,
    price_level: 3,
    distance: '1.1 mi',
  },
  {
    id: '5',
    name: 'Ha Long Bay',
    cuisine: 'Vietnamese',
    address: 'Madison',
    lat: 43.0738,
    lng: -89.4022,
    rating: 4.5,
    photo_url: 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
    is_open: true,
    price_level: 1,
    distance: '1.4 mi',
  },
  {
    id: '6',
    name: 'Taqueria Guanajuato',
    cuisine: 'Mexican',
    address: 'Madison',
    lat: 43.0722,
    lng: -89.4012,
    rating: 4.4,
    photo_url: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&q=80',
    is_open: true,
    price_level: 1,
    distance: '0.9 mi',
  },
]

const PRICE_MAP = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' }

export function normalizeRestaurant(r) {
  return {
    ...r,
    photo: r.photo_url || r.photo,
    open: r.is_open ?? r.open,
    price: r.price_level ? PRICE_MAP[r.price_level] : r.price || '—',
  }
}
