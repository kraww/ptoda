import { useEffect, useState } from 'react'
import { Pencil, Eye, EyeOff, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'

const EMPTY = { title: '', content: '', is_published: false }

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminPosts() {
  const [posts, setPosts] = useState([])
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
    setPosts(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true)
    setMsg(null)
    try {
      const payload = {
        title: form.title.trim(),
        content: form.content.trim(),
        is_published: form.is_published,
        updated_at: new Date().toISOString(),
      }
      if (form.id) {
        await supabase.from('posts').update(payload).eq('id', form.id)
      } else {
        await supabase.from('posts').insert(payload)
      }
      setMsg('Saved')
      setForm(null)
      await load()
    } catch (e) {
      setMsg(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function togglePublish(post) {
    await supabase.from('posts').update({
      is_published: !post.is_published,
      updated_at: new Date().toISOString(),
    }).eq('id', post.id)
    await load()
  }

  async function deletePost(id) {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    await load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Posts</h2>
          <p className="text-text-muted text-sm mt-0.5">Write news and announcements for players</p>
        </div>
        <Button onClick={() => setForm({ ...EMPTY })}>
          <Plus size={14} /> New Post
        </Button>
      </div>

      {msg && (
        <div className="bg-surface border border-border rounded text-text-secondary text-sm px-4 py-2">
          {msg}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {posts.map(post => (
          <div key={post.id} className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary truncate">{post.title}</p>
                {post.is_published
                  ? <span className="shrink-0 text-2xs font-semibold uppercase tracking-wide text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded">Live</span>
                  : <span className="shrink-0 text-2xs font-semibold uppercase tracking-wide text-text-muted bg-card border border-border px-1.5 py-0.5 rounded">Draft</span>
                }
              </div>
              <p className="text-xs text-text-muted mt-0.5">{formatDate(post.created_at)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setForm({ ...post })}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors"
                title="Edit"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => togglePublish(post)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-hover rounded transition-colors"
                title={post.is_published ? 'Unpublish' : 'Publish'}
              >
                {post.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button
                onClick={() => deletePost(post.id)}
                className="p-2 text-text-muted hover:text-danger hover:bg-danger/5 rounded transition-colors"
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <p className="text-text-muted text-sm py-4">No posts yet.</p>
        )}
      </div>

      {/* Editor modal */}
      {form && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg w-full max-w-2xl flex flex-col gap-0 shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-text-primary">{form.id ? 'Edit Post' : 'New Post'}</h3>
              <button onClick={() => setForm(null)} className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none">×</button>
            </div>

            {/* Form */}
            <div className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. New species arriving this weekend"
                  className="field"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-secondary">Content</label>
                <textarea
                  rows={10}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Write your announcement here…"
                  className="field resize-none font-sans leading-relaxed"
                />
                <p className="text-2xs text-text-muted">Plain text. Line breaks are preserved.</p>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={e => setForm(f => ({ ...f, is_published: e.target.checked }))}
                  className="accent-accent w-3.5 h-3.5"
                />
                <span className="text-sm text-text-secondary">Publish immediately</span>
              </label>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-sidebar">
              <Button variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving || !form.title.trim() || !form.content.trim()}>
                {saving ? 'Saving…' : form.id ? 'Save Changes' : 'Create Post'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
