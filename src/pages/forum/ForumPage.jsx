import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pin, MessageCircle, Plus, Image, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

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

export default function ForumPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef()

  async function loadPosts() {
    const { data } = await supabase
      .from('forum_posts')
      .select('id, title, is_pinned, created_at, user_id, author:user_id(username), forum_replies(id)')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadPosts() }, [])

  async function handleImageFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageUploading(true)
    setImageError('')
    try {
      const url = await uploadImage(file)
      setImageUrl(url)
    } catch { setImageError('Image upload failed — try again') }
    finally { setImageUploading(false); e.target.value = '' }
  }

  async function createPost() {
    if (!title.trim() || !body.trim()) return
    setSubmitting(true)
    const { data } = await supabase
      .from('forum_posts')
      .insert({ user_id: user.id, title: title.trim(), body: body.trim(), image_url: imageUrl || null })
      .select()
      .single()
    setSubmitting(false)
    setShowForm(false)
    setTitle(''); setBody(''); setImageUrl('')
    if (data) navigate(`/community/${data.id}`)
    else loadPosts()
  }

  function cancelForm() {
    setShowForm(false)
    setTitle(''); setBody(''); setImageUrl('')
  }

  if (loading) return <LoadingSpinner message="Loading community…" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(s => !s)}>
          <Plus size={14} /> New Post
        </Button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-lg p-4 flex flex-col gap-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post title…"
            maxLength={100}
            className="field text-sm font-medium"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="What's on your mind?"
            rows={4}
            maxLength={2000}
            className="field resize-none text-sm"
          />
          <p className="text-2xs text-text-muted text-right -mt-2">{body.length}/2000</p>

          {imageUrl ? (
            <div className="relative w-fit">
              <img src={imageUrl} alt="" className="max-h-32 rounded border border-border object-contain" />
              <button
                onClick={() => setImageUrl('')}
                className="absolute -top-1.5 -right-1.5 bg-card border border-border rounded-full p-0.5 text-text-muted hover:text-danger transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={imageUploading}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <Image size={13} /> {imageUploading ? 'Uploading…' : 'Add image'}
            </button>
            {imageError && <span className="text-xs text-danger">{imageError}</span>}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
            <div className="flex-1" />
            <Button size="sm" variant="ghost" onClick={cancelForm}>Cancel</Button>
            <Button size="sm" onClick={createPost} disabled={submitting || !title.trim() || !body.trim()}>
              {submitting ? 'Posting…' : 'Post'}
            </Button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-10">No posts yet — start the conversation!</p>
      ) : (
        posts.map(post => (
          <button
            key={post.id}
            onClick={() => navigate(`/community/${post.id}`)}
            className="bg-surface border border-border rounded-lg px-4 py-3 text-left hover:bg-hover transition-colors w-full"
          >
            <div className="flex items-start gap-2">
              {post.is_pinned && <Pin size={12} className="text-accent-light shrink-0 mt-0.5" />}
              <p className="font-medium text-text-primary text-sm flex-1 leading-snug">{post.title}</p>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-text-muted">{post.author?.username ?? '?'}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{timeAgo(post.created_at)}</span>
              <span className="flex items-center gap-1 ml-auto text-xs text-text-muted">
                <MessageCircle size={11} />
                {post.forum_replies?.length ?? 0}
              </span>
            </div>
          </button>
        ))
      )}
    </div>
  )
}
