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

export default function Home() {
  return (
    <main>
      <h1>DeliveryPick</h1>
    </main>
  )
}
