// web/src/components/art/RoomHeader.tsx
import React from 'react';
import { themes } from '../../theme/rooms';

export function RoomHeader({ room }: { room: keyof typeof themes | 'All' }) {
  const isAll = room === 'All';
  const title = isAll ? 'All Rooms' : room;
  const desc = isAll ? 'Explore the Afrodezea World — curated across 7 rooms.' : themes[room].description;
  const hero = isAll ? '/assets/images/rooms/afrodisia/hero.jpg' : `/assets/images/rooms/${String(room).toLowerCase()}/hero.jpg`;
  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height: '100px' }}>
      <img src={hero} alt={String(title)} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.65)' }} />
      <div className="relative h-full w-full flex items-center px-4 md:px-6">
        <div>
          <div className="font-serif text-[1.5rem] md:text-[1.75rem]" style={{ color: 'var(--afro-ivory)' }}>{title}</div>
          <div className="text-xs md:text-sm" style={{ color: 'var(--afro-muted-ivory)' }}>{desc}</div>
        </div>
        <div className="ml-auto text-[11px] md:text-xs" style={{ color: 'var(--afro-muted-ivory)' }}>
          Now Playing: Afrodisia (loop)
        </div>
      </div>
    </div>
  );
}
