import { useEffect, useState } from 'react'
import { Newspaper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default function NewsPage() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('posts')
      .select('id, title, content, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPosts(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingSpinner message="Loading news…" />

  return (
    <div className="flex flex-col gap-6">

      <div>
        <h1 className="text-2xl font-bold text-text-primary">News & Updates</h1>
        <p className="text-text-muted text-sm mt-1">Announcements, patch notes, and what's coming</p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <Newspaper size={36} className="text-text-muted" />
          <p className="text-text-muted text-sm">No posts yet — check back soon</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((post, i) => (
            <article key={post.id} className="bg-surface border border-border rounded-lg overflow-hidden">
              {/* Post header */}
              <div className={`px-5 py-4 ${i === 0 ? 'border-b border-border' : 'border-b border-border'}`}>
                <div className="flex items-start justify-between gap-4">
                  <h2 className="text-base font-semibold text-text-primary leading-snug">{post.title}</h2>
                  {i === 0 && (
                    <span className="shrink-0 text-2xs font-semibold uppercase tracking-wide text-accent-light bg-accent/10 border border-accent/20 px-2 py-0.5 rounded">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-1">{formatDate(post.created_at)}</p>
              </div>

              {/* Post body */}
              <div className="px-5 py-4">
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
