import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Mail, UserPlus, Check, X, Send, ChevronDown, Hash } from 'lucide-react'
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
  const { refresh: refreshCounts } = useSocial()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') ?? 'friends')
  const [toast, setToast] = useState(null)

  // Friends state
  const [friends, setFriends] = useState([])
  const [pendingIn, setPendingIn] = useState([])
  const [pendingSent, setPendingSent] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [friendsLoading, setFriendsLoading] = useState(true)

  // Mail state
  const [messages, setMessages] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [sending, setSending] = useState(false)
  const [mailLoading, setMailLoading] = useState(true)

  useEffect(() => { loadFriends() }, [user])
  useEffect(() => { if (tab === 'mail') loadMessages() }, [tab, user])

  async function loadFriends() {
    if (!user) return
    const { data } = await supabase
      .from('friendships')
      .select('id, status, requester_id, recipient_id, requester:requester_id(id, username), recipient:recipient_id(id, username)')
      .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)

    const all = data ?? []
    const other = f => f.requester_id === user.id ? f.recipient : f.requester

    setFriends(all.filter(f => f.status === 'accepted').map(f => ({ id: f.id, profile: other(f) })))
    setPendingIn(all.filter(f => f.status === 'pending' && f.recipient_id === user.id).map(f => ({ id: f.id, profile: f.requester })))
    setPendingSent(all.filter(f => f.status === 'pending' && f.requester_id === user.id).map(f => ({ id: f.id, profile: f.recipient })))
    setFriendsLoading(false)
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

  async function loadMessages() {
    if (!user) return
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(id, username)')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
    setMessages(data ?? [])
    setMailLoading(false)
  }

  async function expandMessage(msg) {
    setExpandedId(expandedId === msg.id ? null : msg.id)
    if (!msg.is_read) {
      await supabase.from('messages').update({ is_read: true }).eq('id', msg.id)
      setMessages(ms => ms.map(m => m.id === msg.id ? { ...m, is_read: true } : m))
      refreshCounts()
    }
  }

  async function sendMessage() {
    if (!composeTo.trim() || !composeBody.trim()) return
    setSending(true)
    const { data: recipient } = await supabase.from('profiles').select('id').ilike('username', composeTo.trim()).limit(1).maybeSingle()
    if (!recipient) { setToast('User not found'); setSending(false); return }
    const isFriend = friends.some(f => f.profile.id === recipient.id)
    if (!isFriend) { setToast('You can only message friends'); setSending(false); return }
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, recipient_id: recipient.id, body: composeBody.trim() })
    if (error) { setToast('Failed to send'); setSending(false); return }
    setToast('Message sent')
    setComposeOpen(false)
    setComposeTo('')
    setComposeBody('')
    setSending(false)
  }

  const TABS = [
    { id: 'friends',   label: 'Friends',   Icon: Users },
    { id: 'mail',      label: 'Mail',      Icon: Mail },
    { id: 'community', label: 'Community', Icon: Hash },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Social</h1>
        <p className="text-sm text-text-muted mt-0.5">Friends, mail, and more</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-card rounded-lg p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded text-sm font-medium transition-colors
              ${tab === id ? 'bg-surface text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}>
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Friends tab */}
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
                  <div key={id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-text-primary">{profile.username}</p>
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
        </div>
      )}

      {/* Mail tab */}
      {tab === 'mail' && (
        <div className="flex flex-col gap-4">
          {/* Compose */}
          <div className="flex flex-col gap-3">
            <button onClick={() => setComposeOpen(o => !o)}
              className="flex items-center gap-2 text-sm font-medium text-accent-light hover:text-accent transition-colors w-fit">
              <Send size={14} /> New message
              <ChevronDown size={13} className={`transition-transform ${composeOpen ? 'rotate-180' : ''}`} />
            </button>
            {composeOpen && (
              <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">To (username)</label>
                  <input value={composeTo} onChange={e => setComposeTo(e.target.value)}
                    placeholder="Friend's username…" className="field text-sm" />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Message</label>
                  <textarea value={composeBody} onChange={e => setComposeBody(e.target.value)}
                    placeholder="Write something…" rows={3} maxLength={500}
                    className="field resize-none text-sm" />
                  <p className="text-2xs text-text-muted mt-1 text-right">{composeBody.length}/500</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={sendMessage} disabled={sending || !composeTo.trim() || !composeBody.trim()}>
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                  <Button variant="ghost" onClick={() => setComposeOpen(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </div>

          {/* Inbox */}
          {mailLoading ? <LoadingSpinner message="Loading mail…" /> : (
            <div className="flex flex-col gap-2">
              <p className="section-label">Inbox ({messages.length})</p>
              {messages.length === 0
                ? <p className="text-sm text-text-muted">No messages yet</p>
                : messages.map(msg => (
                  <div key={msg.id}
                    className={`bg-surface border rounded-lg overflow-hidden cursor-pointer transition-colors
                      ${!msg.is_read ? 'border-accent/30' : 'border-border'}`}
                    onClick={() => expandMessage(msg)}
                  >
                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {!msg.is_read && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />}
                        <p className={`text-sm truncate ${!msg.is_read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                          {msg.sender?.username ?? '?'}
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
                ))
              }
            </div>
          )}
        </div>
      )}

      {/* Community tab */}
      {tab === 'community' && <ForumPage />}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
