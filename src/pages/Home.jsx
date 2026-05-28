import { useState } from 'react'
  import { Download, Link2, Loader2, AlertCircle, Instagram, Play, Image } from 'lucide-react'
  import { downloadFile } from '../lib/download'

  function MediaCard({ item, index }) {
    const isVideo = item.type === 'video'
    const filename = `nixig-${isVideo ? 'video' : 'image'}-${index + 1}.${isVideo ? 'mp4' : 'jpg'}`

    return (
      <div className="group relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 aspect-[4/5]">
        {isVideo ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt="Video thumbnail" className="w-full h-full object-cover opacity-80" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Play className="w-16 h-16 text-white/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1.5">
              <Play className="w-3 h-3 fill-current" /> Video
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            <img src={item.url} alt="Instagram media" className="w-full h-full object-cover" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <button
            onClick={() => downloadFile(item.url, filename)}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 px-4 rounded-xl hover:bg-zinc-100 active:scale-95 transition-all text-sm shadow-lg"
          >
            <Download className="w-4 h-4" />
            Download {isVideo ? 'Video' : 'Image'}
          </button>
        </div>
      </div>
    )
  }

  export default function Home() {
    const [url, setUrl] = useState('')
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState(null)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
      e.preventDefault()
      if (!url.includes('instagram.com')) {
        setError('Masukkan URL Instagram yang valid.')
        return
      }
      setLoading(true)
      setError(null)
      setResult(null)

      try {
        const res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Gagal mengambil media')
        setResult(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center pt-20 pb-16 px-4">
        {/* Header */}
        <div className="text-center space-y-4 mb-12 max-w-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-2"
            style={{ background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
            <Instagram className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-white">
            Nix Ig Downloader
          </h1>
          <p className="text-lg text-zinc-400 max-w-md mx-auto leading-relaxed">
            Download foto dan video Instagram secara gratis. Tanpa login, tanpa ribet.
          </p>
        </div>

        {/* Input */}
        <div className="w-full max-w-2xl mb-10">
          <form onSubmit={handleSubmit}>
            <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 transition-all px-4">
              <Link2 className="w-5 h-5 text-zinc-500 shrink-0 mr-3" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="flex-1 bg-transparent text-white placeholder:text-zinc-600 py-4 outline-none text-base"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="ml-3 flex items-center gap-2 font-semibold px-6 py-2.5 rounded-xl text-white text-sm transition-all active:scale-95 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #e6683c, #dc2743, #cc2366)' }}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {loading ? 'Loading...' : 'Download'}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="w-full max-w-2xl bg-red-950/50 border border-red-800/50 rounded-2xl p-4 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-red-300">Gagal mengambil media</p>
              <p className="text-sm text-red-400/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && result.success && (
          <div className="w-full max-w-4xl space-y-6">
            {(result.username || result.caption) && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #f09433, #dc2743, #bc1888)' }}>
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  {result.username && <p className="font-semibold text-white">@{result.username}</p>}
                  {result.caption && <p className="text-sm text-zinc-400 truncate">{result.caption}</p>}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {result.media.map((item, i) => (
                <MediaCard key={i} item={item} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* How to use */}
        {!result && !error && (
          <div className="w-full max-w-2xl grid grid-cols-3 gap-4 mt-4">
            {[
              { icon: Link2, step: '1', title: 'Copy Link', desc: 'Salin link post/reel Instagram' },
              { icon: Download, step: '2', title: 'Paste & Download', desc: 'Tempel di kolom atas, klik Download' },
              { icon: Image, step: '3', title: 'Simpan', desc: 'Media langsung tersimpan di perangkat kamu' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-800 mb-3">
                  <Icon className="w-5 h-5 text-pink-400" />
                </div>
                <p className="font-semibold text-white text-sm">{title}</p>
                <p className="text-zinc-500 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-16 text-zinc-700 text-xs text-center">
          Nix Ig Downloader &mdash; Hanya untuk konten publik Instagram
        </p>
      </div>
    )
  }
  