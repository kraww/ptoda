import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'

async function uploadFile(file, folder) {
  const ext = file.name.split('.').pop()
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from('assets').upload(path, file, { upsert: true })
  if (error) throw error
  return supabase.storage.from('assets').getPublicUrl(path).data.publicUrl
}

export default function ImageUpload({ value, onChange, folder = 'misc', size = 56, label }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const ref = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const url = await uploadFile(file, folder)
      onChange(url)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-sm text-slate-400">{label}</span>}
      <div className="flex items-center gap-3">
        {value
          ? <img src={value} alt="" style={{ width: size, height: size }} className="object-contain rounded border border-slate-700 bg-slate-800 shrink-0" />
          : <div style={{ width: size, height: size }} className="rounded border-2 border-dashed border-slate-700 bg-slate-800 flex items-center justify-center shrink-0">
              <Upload size={14} className="text-slate-500" />
            </div>
        }
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className="text-xs text-accent-light hover:underline disabled:opacity-50">
          {uploading ? 'Uploading…' : value ? 'Change' : 'Upload image'}
        </button>
        <input ref={ref} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}
