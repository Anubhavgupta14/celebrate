import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { visitId, lat, lng, status } = req.body

  if (!visitId || !lat || !lng) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // 1. Get the visit and the host's location
    const { data: visit, error: visitError } = await supabaseAdmin
      .from('visits')
      .select('*, host_family:families!visits_host_family_id_fkey(lat, lng)')
      .eq('id', visitId)
      .single()

    if (visitError) throw new Error(visitError.message)
    if (!visit.host_family.lat || !visit.host_family.lng) {
        throw new Error("Host family location is missing")
    }

    // 2. Calculate ETA using OSRM
    const hostLat = visit.host_family.lat
    const hostLng = visit.host_family.lng
    
    // OSRM requires coordinates in longitude,latitude order
    let estimatedParamsMins = null
    try {
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${lng},${lat};${hostLng},${hostLat}?overview=false`
        const osrmResponse = await fetch(osrmUrl)
        const osrmData = await osrmResponse.json()
        
        if (osrmData.routes && osrmData.routes.length > 0) {
            const durationSeconds = osrmData.routes[0].duration
            estimatedParamsMins = Math.round(durationSeconds / 60)
        }
    } catch (e) {
        console.error("OSRM error:", e)
        // gracefully continue even if OSRM fails
    }

    // 3. Update the visit in Supabase
    const { data: updatedVisit, error: updateError } = await supabaseAdmin
      .from('visits')
      .update({ 
        status: status || 'in_transit',
        estimated_travel_time_mins: estimatedParamsMins
      })
      .eq('id', visitId)
      .select()
      .single()

    if (updateError) throw new Error(updateError.message)

    res.status(200).json({ success: true, visit: updatedVisit })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
