import type { QuranAyahCardData } from '@chat/shared/quran-ayah'
import { ExternalLink, Volume2 } from '@/lib/icons'
import { cn } from '@/lib/utils'

export function QuranAyahCard({
  ayah,
  className,
}: {
  ayah: QuranAyahCardData
  className?: string
}) {
  return (
    <section
      className={cn(
        'not-prose overflow-hidden rounded-[1.6rem] border border-amber-500/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_38%),linear-gradient(180deg,rgba(36,26,14,0.96),rgba(17,14,10,0.98))] p-4 text-amber-50 shadow-[0_18px_48px_rgba(15,23,42,0.22)] sm:p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex rounded-full border border-amber-400/25 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold tracking-[0.24em] uppercase text-amber-200">
          {ayah.verseKey || 'Aya'}
        </div>

        {ayah.sourceUrl ? (
          <a
            href={ayah.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-100/72 transition hover:text-amber-50"
          >
            Source
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>

      <blockquote
        dir="rtl"
        className="mt-4 text-right font-serif text-[1.8rem] leading-[2.35] tracking-[0.01em] text-amber-50 sm:text-[2.15rem]"
      >
        {ayah.arabic}
      </blockquote>

      {ayah.audioUrl ? (
        <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-black/18 p-3">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.22em] uppercase text-amber-100/70">
            <Volume2 className="size-3.5" />
            Recitation
          </div>
          <audio
            controls
            preload="none"
            src={ayah.audioUrl}
            className="h-10 w-full accent-amber-400"
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      ) : null}
    </section>
  )
}
