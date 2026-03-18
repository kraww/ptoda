import { useEffect, useState } from 'react'
import { Pin, PinOff, Trash2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminForum() {
  const [posts, setPosts] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [replies, setReplies] = useState({}) // postId → replies[]
  const [msg, setMsg] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('forum_posts')
      .select('*, author:user_id(username), forum_replies(id)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function togglePin(post) {
    await supabase.from('forum_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id)
    setMsg(post.is_pinned ? 'Post unpinned' : 'Post pinned')
    await load()
  }

  async function deletePost(id) {
    if (!confirm('Delete this post and all its replies?')) return
    await supabase.from('forum_posts').delete().eq('id', id)
    setMsg('Post deleted')
    setExpandedId(null)
    await load()
  }

  async function loadReplies(postId) {
    const { data } = await supabase
      .from('forum_replies')
      .select('id, body, created_at, author:user_id(username)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setReplies(r => ({ ...r, [postId]: data ?? [] }))
  }

  async function deleteReply(replyId, postId) {
    if (!confirm('Delete this reply?')) return
    await supabase.from('forum_replies').delete().eq('id', replyId)
    await loadReplies(postId)
    await load()
  }

  async function toggleExpand(post) {
    if (expandedId === post.id) {
      setExpandedId(null)
    } else {
      setExpandedId(post.id)
      if (!replies[post.id]) await loadReplies(post.id)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Forum</h2>
        <p className="text-text-muted text-sm mt-0.5">Moderate community posts and replies</p>
      </div>

      {msg && (
        <div className="bg-surface border border-border rounded text-text-secondary text-sm px-4 py-2">
          {msg}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {posts.length === 0 && <p className="text-text-muted text-sm py-4">No forum posts yet.</p>}

        {posts.map(post => (
          <div key={post.id} className="bg-surface border border-border rounded-lg overflow-hidden">
            {/* Post row */}
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {post.is_pinned && <Pin size={11} className="text-accent-light shrink-0" />}
                  <p className="text-sm font-medium text-text-primary truncate">{post.title}</p>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {post.author?.username ?? '?'} · {formatDate(post.created_at)} · {post.forum_replies?.length ?? 0} replies
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => toggleExpand(post)}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors"
                  title="View replies"
                >
                  {expandedId === post.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  onClick={() => togglePin(post)}
                  className="p-2 text-text-muted hover:text-accent-light hover:bg-hover rounded transition-colors"
                  title={post.is_pinned ? 'Unpin' : 'Pin'}
                >
                  {post.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
                <button
                  onClick={() => deletePost(post.id)}
                  className="p-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded transition-colors"
                  title="Delete post"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Replies panel */}
            {expandedId === post.id && (
              <div className="border-t border-border px-4 py-3 flex flex-col gap-2 bg-bg">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">
                  Replies ({replies[post.id]?.length ?? 0})
                </p>
                {(replies[post.id] ?? []).length === 0 && (
                  <p className="text-xs text-text-muted">No replies yet.</p>
                )}
                {(replies[post.id] ?? []).map(r => (
                  <div key={r.id} className="flex items-start gap-3 bg-surface border border-border rounded px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-secondary">{r.author?.username ?? '?'} · {formatDate(r.created_at)}</p>
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{r.body}</p>
                    </div>
                    <button
                      onClick={() => deleteReply(r.id, post.id)}
                      className="p-1 text-text-muted hover:text-danger transition-colors shrink-0"
                      title="Delete reply"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
