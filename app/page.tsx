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
      <h1>DeliveryPick</h1>
      <h2>맛집 목록</h2>

      {restaurants.length === 0 ? (
        <p>음식 목록을 불러올 수 없습니다.</p>
      ) : (
        <div>
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px' }}>
              <h3>{restaurant.name}</h3>
              <p>종류: {restaurant.cuisine_type}</p>
              <p>위치: {restaurant.location}</p>
              <p>평점: ⭐ {restaurant.rating}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
