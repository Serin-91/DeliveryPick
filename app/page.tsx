import { supabase } from '@/lib/supabase'

interface Restaurant {
  id: number
  name: string
  cuisine_type: string
  location: string
  rating: number
}

async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('rating', { ascending: false })

  if (error) {
    console.error('Failed to fetch restaurants:', error)
    return []
  }

  return data || []
}

export default async function Home() {
  const restaurants = await getRestaurants()

  return (
    <main style={{ padding: '20px' }}>
      <h1>🍽️ DeliveryPick</h1>
      <p>Welcome to your delivery app!</p>

      <h2>Popular Restaurants</h2>
      {restaurants.length === 0 ? (
        <p>No restaurants available</p>
      ) : (
        <div style={{ display: 'grid', gap: '15px' }}>
          {restaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#f9f9f9',
              }}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>{restaurant.name}</h3>
              <p style={{ margin: '5px 0' }}>
                <strong>Type:</strong> {restaurant.cuisine_type}
              </p>
              <p style={{ margin: '5px 0' }}>
                <strong>Location:</strong> {restaurant.location}
              </p>
              <p style={{ margin: '5px 0', color: '#ff6b6b' }}>
                <strong>Rating:</strong> ⭐ {restaurant.rating}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
