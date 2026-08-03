import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Restaurant {
  id: number
  name: string
  cuisine_type: string
  location: string
  rating: number
}

async function getRestaurants(): Promise<{ restaurants: Restaurant[]; debug: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const envInfo = `url_len=${url.length} url_ends="${url.slice(-15)}" key_len=${key.length}`

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('rating', { ascending: false })

  if (error) {
    console.error('Failed to fetch restaurants:', error)
    return { restaurants: [], debug: `${envInfo} | error=${JSON.stringify(error)}` }
  }

  return { restaurants: data || [], debug: envInfo }
}

export default async function Home() {
  const { restaurants, debug } = await getRestaurants()

  return (
    <main style={{ padding: '20px' }}>
      <h1>DeliveryPick</h1>
      <h2>맛집 목록</h2>

      {restaurants.length === 0 ? (
        <div>
          <p>음식 목록을 불러올 수 없습니다.</p>
          <p style={{ fontSize: '12px', color: 'gray' }}>DEBUG: {debug}</p>
        </div>
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
