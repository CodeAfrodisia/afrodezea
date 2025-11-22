// web/src/components/art/AudioToggle.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function AudioToggle() {
  const [on, setOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    if (on) {
      audioRef.current.volume = 0.3;
      audioRef.current.loop = true;
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [on]);

  return (
    <div className="flex items-center">
      <button
        onClick={() => setOn(v => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]"
        style={{
          borderColor: 'color-mix(in oklab, var(--afro-gold) 40%, transparent)',
          background: 'color-mix(in oklab, var(--afro-charcoal-soft) 60%, transparent)',
          color: 'var(--afro-muted-ivory)'
        }}
        title="Toggle music"
      >
        {on ? <Volume2 size={14} /> : <VolumeX size={14} />}
        <span>Music</span>
      </button>
      {/* default ambient track; per-room tracks can override in Immerse */}
      <audio ref={audioRef} src="/assets/audio/afrodisia/track04-afrodisia.mp3" />
    </div>
  );
}
