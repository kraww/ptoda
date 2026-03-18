// Bootstrap fallback — ensures the original owner always has access
// even before the is_admin DB column is populated.
const BOOTSTRAP_ADMIN_IDS = ['a9a09202-6f21-4b9a-bb20-d0d38c49d9d7']

// Pass the full profile object (from AuthContext or AdminUsers query).
export const isAdmin = (profile) =>
  profile?.is_admin === true || BOOTSTRAP_ADMIN_IDS.includes(profile?.id)
