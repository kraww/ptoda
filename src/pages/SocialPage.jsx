import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Users, Mail, UserPlus, Check, X, Send, ChevronDown, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useSocial } from '../context/SocialContext'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Toast from '../components/ui/Toast'
import ForumPage from './forum/ForumPage'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function SocialPage() {
  const { user } = useAuth()
  const { pendingCount, unreadCount, refresh: refreshCounts } = useSocial()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'community')
  const [dismissed, setDismissed] = useState({ friends: pendingCount, mail: unreadCount })

  function switchTab(id) {
    if (id === 'friends') setDismissed(d => ({ ...d, friends: pendingCount }))
    if (id === 'mail')    setDismissed(d => ({ ...d, mail: unreadCount }))
    setTab(id)
  }
  const [toast, setToast] = useState(null)

  // Friends state
  const [friends, setFriends]       = useState([])
  const [pendingIn, setPendingIn]   = useState([])
  const [pendingSent, setPendingSent] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching]   = useState(false)
  const [friendsLoading, setFriendsLoading] = useState(true)
  const [activity, setActivity]     = useState([])
  const [activityLoading, setActivityLoading] = useState(false)

  // Mail state
  const [mailBox, setMailBox]       = useState('inbox')   // 'inbox' | 'outbox'
  const [inbox, setInbox]           = useState([])
  const [outbox, setOutbox]         = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeTo, setComposeTo]   = useState('')         // profile id
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending]       = useState(false)
  const [mailLoading, setMailLoading] = useState(true)

  useEffect(() => { loadFriends() }, [user])
  useEffect(() => { if (tab === 'mail') loadMail() }, [tab, user])

  async function loadFriends() {
    if (!user) return
    const { data } = await supabase
      .from('friendships')
      .select('id, status, requester_id, recipient_id, requester:requester_id(id, username), recipient:recipient_id(id, username)')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)

    const all = data ?? []
    const other = f => f.requester_id === user.id ? f.recipient : f.requester

    const accepted = all.filter(f => f.status === 'accepted').map(f => ({ id: f.id, profile: other(f) }))
    setFriends(accepted)
    setPendingIn(all.filter(f => f.status === 'pending' && f.recipient_id === user.id).map(f => ({ id: f.id, profile: f.requester })))
    setPendingSent(all.filter(f => f.status === 'pending' && f.requester_id === user.id).map(f => ({ id: f.id, profile: f.recipient })))
    setFriendsLoading(false)

    if (accepted.length > 0) loadActivity(accepted)
  }

  const ACTIVITY_LABELS = {
    feed: 'fed', play: 'played with', clean: 'cleaned',
    sleep: 'put to sleep', medicine: 'gave medicine to', item: 'used an item on',
  }

  async function loadActivity(friendList) {
    setActivityLoading(true)
    const friendIds = friendList.map(f => f.profile.id)
    const usernameMap = Object.fromEntries(friendList.map(f => [f.profile.id, f.profile.username]))

    const { data: pets } = await supabase
      .from('pets')
      .select('id, name, user_id')
      .in('user_id', friendIds)
      .eq('is_alive', true)

    if (!pets?.length) { setActivityLoading(false); return }

    const petIds = pets.map(p => p.id)
    const petMap = Object.fromEntries(pets.map(p => [p.id, p]))

    const { data: logs } = await supabase
      .from('care_log')
      .select('action, created_at, pet_id')
      .in('pet_id', petIds)
      .order('created_at', { ascending: false })
      .limit(20)

    setActivity((logs ?? []).map(log => {
      const pet = petMap[log.pet_id]
      return { ...log, petName: pet?.name ?? '?', username: usernameMap[pet?.user_id] ?? '?' }
    }))
    setActivityLoading(false)
  }

  async function loadMail() {
    if (!user) return
    const [{ data: inData }, { data: outData }] = await Promise.all([
      supabase
        .from('messages')
        .select('*, sender:sender_id(id, username)')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('messages')
        .select('*, recipient:recipient_id(id, username)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false }),
    ])
    setInbox(inData ?? [])
    setOutbox(outData ?? [])
    setMailLoading(false)
  }

  // Open compose pre-filled for a specific friend, switching to mail tab
  function mailFriend(profileId) {
    setComposeTo(profileId)
    setComposeOpen(true)
    setComposeBody('')
    setTab('mail')
  }

  async function searchUser() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchResult(null)
    const { data } = await supabase.from('profiles').select('id, username').ilike('username', searchQuery.trim()).neq('id', user.id).limit(1).maybeSingle()
    setSearchResult(data ?? false)
    setSearching(false)
  }

  async function sendRequest(recipientId) {
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, recipient_id: recipientId })
    if (error) { setToast('Could not send request'); return }
    setToast('Friend request sent')
    setSearchResult(null)
    setSearchQuery('')
    await loadFriends()
    refreshCounts()
  }

  async function acceptRequest(friendshipId) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)
    setToast('Friend added')
    await loadFriends()
    refreshCounts()
  }

  async function declineRequest(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadFriends()
    refreshCounts()
  }

  async function removeFriend(friendshipId) {
    if (!confirm('Remove this friend?')) return
    await supabase.from('friendships').delete().eq('id', friendshipId)
    await loadFriends()
    refreshCounts()
  }

  async function expandMessage(msg) {
    setExpandedId(expandedId === msg.id ? null : msg.id)
    if (!msg.is_read && mailBox === 'inbox') {
      await supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
      setInbox(ms => ms.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
      refreshCounts()
    }
  }

  async function sendMessage() {
    if (!composeTo || !composeBody.trim()) return
    setSending(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: composeTo,
      body: composeBody.trim(),
    })
    if (error) { setToast('Failed to send'); setSending(false); return }
    setToast('Message sent')
    setComposeOpen(false)
    setComposeTo('')
    setComposeBody('')
    setSending(false)
    await loadMail()
  }

  const TABS = [
    { id: 'community', label: 'Community', Icon: MessageSquare },
    { id: 'friends',   label: 'Friends',   Icon: Users },
    { id: 'mail',      label: 'Mail',      Icon: Mail },
  ]

  const currentMessages = mailBox === 'inbox' ? inbox : outbox

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Social</h1>
        <p className="text-sm text-text-muted mt-0.5">Friends, mail, and more</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1">
        {TABS.map(({ id, label, Icon }) => {
          const badge = id === 'friends' && pendingCount > dismissed.friends ? pendingCount
                      : id === 'mail'    && unreadCount  > dismissed.mail    ? unreadCount
                      : 0
          return (
            <button key={id} onClick={() => switchTab(id)}
              className={`relative flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors
                ${tab === id ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}>
              <Icon size={14} />
              {label}
              {badge > 0 && (
                <span className={`absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center
                  ${id === 'friends' ? 'bg-accent' : 'bg-orange-500'}`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Friends tab ── */}
      {tab === 'friends' && (
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
                placeholder="Search by username…"
                className="field flex-1 text-sm"
              />
              <Button onClick={searchUser} disabled={searching} size="sm">
                {searching ? '…' : 'Search'}
              </Button>
            </div>
            {searchResult === false && <p className="text-xs text-text-muted">No user found</p>}
            {searchResult && (
              <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-text-primary">{searchResult.username}</p>
                {pendingSent.some(f => f.profile.id === searchResult.id)
                  ? <span className="text-xs text-text-muted">Request sent</span>
                  : friends.some(f => f.profile.id === searchResult.id)
                    ? <span className="text-xs text-text-muted">Already friends</span>
                    : <Button size="sm" onClick={() => sendRequest(searchResult.id)}><UserPlus size={13} /> Add</Button>
                }
              </div>
            )}
          </div>

          {/* Incoming requests */}
          {pendingIn.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="section-label">Requests ({pendingIn.length})</p>
              {pendingIn.map(({ id, profile }) => (
                <div key={id} className="bg-surface border border-accent/20 rounded-lg px-4 py-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-text-primary">{profile.username}</p>
                  <div className="flex gap-2">
                    <button onClick={() => acceptRequest(id)} className="text-accent-light hover:text-accent transition-colors"><Check size={16} /></button>
                    <button onClick={() => declineRequest(id)} className="text-text-muted hover:text-danger transition-colors"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Friends list */}
          {friendsLoading ? <LoadingSpinner message="Loading…" /> : (
            <div className="flex flex-col gap-2">
              <p className="section-label">Friends ({friends.length})</p>
              {friends.length === 0
                ? <p className="text-sm text-text-muted">No friends yet — search for someone above</p>
                : friends.map(({ id, profile }) => (
                  <div key={id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                    <Link
                      to={`/user/${profile.username}`}
                      className="text-sm font-medium text-text-primary hover:text-accent-light transition-colors flex-1"
                    >
                      {profile.username}
                    </Link>
                    <button
                      onClick={() => mailFriend(profile.id)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-light transition-colors"
                      title="Send mail"
                    >
                      <Mail size={13} /> Mail
                    </button>
                    <button onClick={() => removeFriend(id)} className="text-2xs text-text-muted hover:text-danger transition-colors">Remove</button>
                  </div>
                ))
              }
            </div>
          )}

          {/* Sent pending */}
          {pendingSent.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="section-label">Sent requests</p>
              {pendingSent.map(({ id, profile }) => (
                <div key={id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between opacity-60">
                  <p className="text-sm text-text-muted">{profile.username}</p>
                  <button onClick={() => declineRequest(id)} className="text-2xs text-text-muted hover:text-danger transition-colors">Cancel</button>
                </div>
              ))}
            </div>
          )}

          {/* Activity feed */}
          {friends.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="section-label">Recent activity</p>
              {activityLoading && <p className="text-xs text-text-muted">Loading…</p>}
              {!activityLoading && activity.length === 0 && (
                <p className="text-xs text-text-muted">No recent activity from friends.</p>
              )}
              {activity.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-xs text-text-muted gap-2">
                  <p>
                    <span className="text-text-secondary font-medium">{entry.username}</span>
                    {' '}{ACTIVITY_LABELS[entry.action] ?? entry.action}{' '}
                    <span className="text-text-secondary font-medium">{entry.petName}</span>
                  </p>
                  <span className="shrink-0">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Mail tab ── */}
      {tab === 'mail' && (
        <div className="flex flex-col gap-4">

          {/* Compose */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setComposeOpen(o => !o); if (!composeOpen) { setComposeTo(''); setComposeBody('') } }}
              className="flex items-center gap-2 text-sm font-medium text-accent-light hover:text-accent transition-colors w-fit"
            >
              <Send size={14} /> New message
              <ChevronDown size={13} className={`transition-transform ${composeOpen ? 'rotate-180' : ''}`} />
            </button>

            {composeOpen && (
              <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">To</label>
                  {friends.length === 0 ? (
                    <p className="text-xs text-text-muted">You need friends to send mail.</p>
                  ) : (
                    <select
                      value={composeTo}
                      onChange={e => setComposeTo(e.target.value)}
                      className="field text-sm"
                    >
                      <option value="">Select a friend…</option>
                      {friends.map(({ profile }) => (
                        <option key={profile.id} value={profile.id}>{profile.username}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Message</label>
                  <textarea
                    value={composeBody}
                    onChange={e => setComposeBody(e.target.value)}
                    placeholder="Write something…"
                    rows={3}
                    maxLength={500}
                    className="field resize-none text-sm"
                  />
                  <p className="text-2xs text-text-muted mt-1 text-right">{composeBody.length}/500</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={sendMessage} disabled={sending || !composeTo || !composeBody.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                  <Button variant="ghost" onClick={() => setComposeOpen(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Inbox / Outbox toggle */}
          <div className="flex gap-1 bg-card rounded p-1 w-fit">
            {['inbox', 'outbox'].map(box => (
              <button
                key={box}
                onClick={() => { setMailBox(box); setExpandedId(null) }}
                className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors
                  ${mailBox === box ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {box}
              </button>
            ))}
          </div>

          {/* Messages list */}
          {mailLoading ? <LoadingSpinner message="Loading mail…" /> : (
            <div className="flex flex-col gap-2">
              <p className="section-label capitalize">{mailBox} ({currentMessages.length})</p>
              {currentMessages.length === 0
                ? <p className="text-sm text-text-muted">{mailBox === 'inbox' ? 'No messages yet' : 'Nothing sent yet'}</p>
                : currentMessages.map(msg => {
                  const label = mailBox === 'inbox'
                    ? (msg.sender?.username ?? '?')
                    : `To: ${msg.recipient?.username ?? '?'}`
                  const isUnread = mailBox === 'inbox' && !msg.is_read

                  return (
                    <div
                      key={msg.id}
                      className={`bg-surface border rounded-lg overflow-hidden cursor-pointer transition-colors
                        ${isUnread ? 'border-accent/30' : 'border-border'}`}
                      onClick={() => expandMessage(msg)}
                    >
                      <div className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                          <p className={`text-sm shrink-0 ${isUnread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                            {label}
                          </p>
                          <p className="text-xs text-text-muted truncate flex-1">
                            {expandedId === msg.id ? '' : msg.body}
                          </p>
                        </div>
                        <span className="text-2xs text-text-muted shrink-0">{timeAgo(msg.created_at)}</span>
                      </div>
                      {expandedId === msg.id && (
                        <div className="px-4 pb-3 border-t border-border">
                          <p className="text-sm text-text-secondary mt-2 leading-relaxed">{msg.body}</p>
                        </div>
                      )}
                    </div>
                  )
                })
              }
            </div>
          )}
        </div>
      )}

      {/* ── Community tab ── */}
      {tab === 'community' && <ForumPage />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
