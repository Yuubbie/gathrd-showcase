import { useState } from 'react';
import { Play } from 'lucide-react';

// Click-to-load YouTube player: shows only the thumbnail until clicked, so the page
// stays fast on slow connections. The video loads from youtube-nocookie.com on click.
export default function LiteYouTube({ videoId, title }) {
  const [active, setActive] = useState(false);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-ink shadow-xl">
      {active ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 h-full w-full"
        >
          <img
            src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <span className="absolute inset-0 bg-ink/20 transition-colors group-hover:bg-ink/30" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-signal text-white shadow-lg transition-colors group-hover:bg-signal-deep md:h-20 md:w-20">
              <Play size={30} fill="currentColor" className="ml-1" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
