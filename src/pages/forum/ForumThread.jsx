import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CornerDownRight, Pin, Trash2, Pencil, X, Image } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Toast from '../../components/ui/Toast'

const ADMIN_ID = 'a9a09202-6f21-4b9a-bb20-d0d38c49d9d7'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

async function uploadImage(file) {
  const ext = file.name.split('.').pop()
  const path = `forum/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('assets').getPublicUrl(path).data.publicUrl
}

export default function ForumThread() {
  const { postId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin = user?.id === ADMIN_ID

  const [post, setPost] = useState(null)
  const [replies, setReplies] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Reply state
  const [replyBody, setReplyBody] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Edit post state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editImageUrl, setEditImageUrl] = useState('')
  const [editImageUploading, setEditImageUploading] = useState(false)
  const editFileRef = useRef()

  const [toast, setToast] = useState(null)

  async function loadPost() {
    const { data } = await supabase
      .from('forum_posts')
      .select('*, author:user_id(username)')
      .eq('id', postId)
      .maybeSingle()
    if (!data) { setNotFound(true); return }
    setPost(data)
  }

  async function loadReplies() {
    const { data } = await supabase
      .from('forum_replies')
      .select('*, author:user_id(username), parent:reply_to_id(id, body, author:user_id(username))')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    setReplies(data ?? [])
  }

  useEffect(() => {
    async function load() {
      await Promise.all([loadPost(), loadReplies()])
      setLoading(false)
    }
    load()
  }, [postId])

  async function submitReply() {
    if (!replyBody.trim()) return
    setSubmitting(true)
    await supabase.from('forum_replies').insert({
      post_id: postId,
      user_id: user.id,
      body: replyBody.trim(),
      reply_to_id: replyTo?.id ?? null,
    })
    setReplyBody('')
    setReplyTo(null)
    setSubmitting(false)
    await loadReplies()
  }

  async function deleteReply(replyId) {
    if (!confirm('Delete this reply?')) return
    await supabase.from('forum_replies').delete().eq('id', replyId)
    await loadReplies()
  }

  async function handleEditImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setEditImageUploading(true)
    try {
      const url = await uploadImage(file)
      setEditImageUrl(url)
    } catch { /* ignore */ }
    finally { setEditImageUploading(false); e.target.value = '' }
  }

  async function saveEdit() {
    if (!editTitle.trim() || !editBody.trim()) return
    await supabase.from('forum_posts').update({
      title: editTitle.trim(),
      body: editBody.trim(),
      image_url: editImageUrl || null,
      updated_at: new Date().toISOString(),
    }).eq('id', postId)
    setEditing(false)
    await loadPost()
    setToast('Post updated')
  }

  async function deletePost() {
    if (!confirm('Delete this post and all replies? This cannot be undone.')) return
    await supabase.from('forum_posts').delete().eq('id', postId)
    navigate('/social')
  }

  function startEdit() {
    setEditTitle(post.title)
    setEditBody(post.body)
    setEditImageUrl(post.image_url ?? '')
    setEditing(true)
  }

  if (loading) return <LoadingSpinner message="Loading thread…" />

  if (notFound) return (
    <div className="max-w-2xl mx-auto px-4 pt-10 flex flex-col items-center gap-3 text-center">
      <p className="text-text-primary font-semibold">Post not found</p>
      <button onClick={() => navigate('/social')} className="text-accent-light text-sm hover:underline">Back to community</button>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-5">

      <button
        onClick={() => navigate('/social')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Community
      </button>

      {/* Post */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        {post.is_pinned && (
          <div className="px-4 py-1.5 bg-accent/5 border-b border-accent/20 flex items-center gap-1.5">
            <Pin size={11} className="text-accent-light" />
            <span className="text-2xs font-semibold text-accent-light uppercase tracking-wide">Pinned</span>
          </div>
        )}

        <div className="p-4 flex flex-col gap-3">
          {editing ? (
            <div className="flex flex-col gap-3">
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="field text-sm font-medium"
                placeholder="Title…"
                maxLength={100}
              />
              <textarea
                value={editBody}
                onChange={e => setEditBody(e.target.value)}
                rows={6}
                maxLength={2000}
                className="field resize-none text-sm"
              />

              {/* Image in edit mode */}
              {editImageUrl ? (
                <div className="relative w-fit">
                  <img src={editImageUrl} alt="" className="max-h-32 rounded border border-border object-contain" />
                  <button
                    onClick={() => setEditImageUrl('')}
                    className="absolute -top-1.5 -right-1.5 bg-card border border-border rounded-full p-0.5 text-text-muted hover:text-danger transition-colors"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : null}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => editFileRef.current?.click()}
                  disabled={editImageUploading}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <Image size={13} /> {editImageUploading ? 'Uploading…' : editImageUrl ? 'Change image' : 'Add image'}
                </button>
                <input ref={editFileRef} type="file" accept="image/*" onChange={handleEditImageFile} className="hidden" />
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                <Button size="sm" onClick={saveEdit} disabled={!editTitle.trim() || !editBody.trim()}>Save</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <h1 className="text-lg font-bold text-text-primary flex-1 leading-snug">{post.title}</h1>
                <div className="flex items-center gap-0.5 shrink-0">
                  {(user?.id === post.user_id || isAdmin) && (
                    <button
                      onClick={startEdit}
                      className="p-1.5 text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors"
                      title="Edit post"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={deletePost}
                      className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/5 rounded transition-colors"
                      title="Delete post"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{post.body}</p>

              {post.image_url && (
                <img
                  src={post.image_url}
                  alt=""
                  className="max-w-full rounded-lg border border-border max-h-96 object-contain"
                />
              )}

              <p className="text-xs text-text-muted">
                by <span className="text-text-secondary font-medium">{post.author?.username ?? '?'}</span>
                {' · '}{timeAgo(post.created_at)}
                {post.updated_at && post.updated_at !== post.created_at && (
                  <span className="italic"> · edited</span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Replies */}
      <div className="flex flex-col gap-2">
        <p className="section-label">Replies ({replies.length})</p>

        {replies.length === 0 && (
          <p className="text-sm text-text-muted">No replies yet — start the discussion</p>
        )}

        {replies.map(r => (
          <div key={r.id} className="bg-surface border border-border rounded-lg px-4 py-3 flex flex-col gap-2">
            {r.parent && (
              <div className="flex items-start gap-1.5 pl-2 border-l-2 border-border">
                <CornerDownRight size={11} className="text-text-muted mt-0.5 shrink-0" />
                <p className="text-xs text-text-muted line-clamp-2 flex-1">
                  <span className="text-text-secondary font-medium">{r.parent.author?.username ?? '?'}</span>: {r.parent.body}
                </p>
              </div>
            )}

            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{r.body}</p>

            <div className="flex items-center gap-3">
              <span className="text-xs text-text-muted">
                <span className="text-text-secondary font-medium">{r.author?.username ?? '?'}</span>
                {' · '}{timeAgo(r.created_at)}
              </span>
              {user && (
                <button
                  onClick={() => setReplyTo(r)}
                  className="text-xs text-text-muted hover:text-accent-light transition-colors ml-auto"
                >
                  Reply
                </button>
              )}
              {(isAdmin || user?.id === r.user_id) && (
                <button
                  onClick={() => deleteReply(r.id)}
                  className="text-xs text-text-muted hover:text-danger transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reply composer */}
      {user && (
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          {replyTo && (
            <div className="flex items-center gap-2 bg-card rounded px-3 py-2">
              <CornerDownRight size={11} className="text-text-muted shrink-0" />
              <p className="text-xs text-text-muted flex-1 line-clamp-1">
                Replying to <span className="text-text-secondary font-medium">{replyTo.author?.username ?? '?'}</span>: {replyTo.body}
              </p>
              <button onClick={() => setReplyTo(null)} className="text-text-muted hover:text-text-primary transition-colors">
                <X size={12} />
              </button>
            </div>
          )}
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Write a reply…"
            rows={3}
            maxLength={1000}
            className="field resize-none text-sm"
          />
          <div className="flex items-center justify-between">
            <p className="text-2xs text-text-muted">{replyBody.length}/1000</p>
            <Button size="sm" onClick={submitReply} disabled={submitting || !replyBody.trim()}>
              {submitting ? 'Posting…' : 'Reply'}
            </Button>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
