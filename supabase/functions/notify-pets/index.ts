import { createClient } from 'npm:@supabase/supabase-js@2'
// @ts-ignore
import webpush from 'npm:web-push@3'

const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

webpush.setVapidDetails('mailto:admin@tpoda.org', VAPID_PUBLIC, VAPID_PRIVATE)

const LOW = 30  // stat threshold to trigger notification

async function sendPush(supabase: ReturnType<typeof createClient>, subMap: Record<string, unknown>, pet: { user_id: string; name: string }, payload: string): Promise<boolean> {
  const sub = subMap[pet.user_id]
  if (!sub) return false
  try {
    await webpush.sendNotification(sub, payload)
    return true
  } catch (e: any) {
    if (e.statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('user_id', pet.user_id)
    }
    return false
  }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

  // Find all alive, non-released pets
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, user_id, hunger, happiness, cleanliness, energy, is_sick, is_sleeping')
    .eq('is_alive', true)
    .eq('is_released', false)

  if (!pets?.length) return new Response('no pets', { status: 200 })

  // Sick pets (urgent — regardless of stats)
  const sickPets = pets.filter(p => p.is_sick)

  // Non-sick, non-sleeping pets with at least one low stat
  const lowStatPets = pets.filter(p =>
    !p.is_sick && !p.is_sleeping &&
    (p.hunger < LOW || p.happiness < LOW || p.cleanliness < LOW || p.energy < LOW)
  )

  const needsAttention = [...sickPets, ...lowStatPets]
  if (!needsAttention.length) return new Response('all good', { status: 200 })

  // Get push subscriptions for affected users
  const userIds = [...new Set(needsAttention.map(p => p.user_id))]
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('user_id, subscription')
    .in('user_id', userIds)

  if (!subs?.length) return new Response('no subscriptions', { status: 200 })

  const subMap = Object.fromEntries(subs.map(s => [s.user_id, s.subscription]))

  let sent = 0

  // Send sick notifications first (urgent)
  for (const pet of sickPets) {
    const payload = JSON.stringify({
      title: `${pet.name} is sick!`,
      body:  `${pet.name} needs medicine urgently — they could be lost if left untreated.`,
      url:   '/pet',
    })
    if (await sendPush(supabase, subMap, pet, payload)) sent++
  }

  // Send low-stat notifications (skip users already notified for sickness)
  const sickUserIds = new Set(sickPets.map(p => p.user_id))
  for (const pet of lowStatPets) {
    if (sickUserIds.has(pet.user_id)) continue  // already sent a more urgent message

    const lowStats = []
    if (pet.hunger      < LOW) lowStats.push('hungry')
    if (pet.happiness   < LOW) lowStats.push('unhappy')
    if (pet.cleanliness < LOW) lowStats.push('dirty')
    if (pet.energy      < LOW) lowStats.push('tired')

    const payload = JSON.stringify({
      title: `${pet.name} needs you!`,
      body:  `${pet.name} is ${lowStats.join(' and ')}. Come take care of them.`,
      url:   '/pet',
    })
    if (await sendPush(supabase, subMap, pet, payload)) sent++
  }

  return new Response(`sent ${sent} notifications`, { status: 200 })
})
