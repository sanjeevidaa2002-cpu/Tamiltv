'use client';

import React from 'react';
import {
  Film,
  Trophy,
  Sparkles,
  Music,
  Gamepad2,
  Compass,
  Flame,
  Tv,
  Globe,
  Clapperboard,
  Video,
  Heart,
  BookOpen,
  Layers,
  Smile,
  Shield,
  Zap,
  Camera,
  Radio,
  Folder,
} from 'lucide-react';

export const SECTION_ICONS_LIST = [
  { name: 'Film', label: 'Film & Movies', Icon: Film },
  { name: 'Trophy', label: 'Sports & Competition', Icon: Trophy },
  { name: 'Sparkles', label: 'Entertainment & Shows', Icon: Sparkles },
  { name: 'Music', label: 'Music & Audio', Icon: Music },
  { name: 'Gamepad2', label: 'Gaming & Esports', Icon: Gamepad2 },
  { name: 'Compass', label: 'Documentary & Nature', Icon: Compass },
  { name: 'Flame', label: 'Trending & Popular', Icon: Flame },
  { name: 'Tv', label: 'TV & Series', Icon: Tv },
  { name: 'Globe', label: 'News & World', Icon: Globe },
  { name: 'Clapperboard', label: 'Cinema & Directing', Icon: Clapperboard },
  { name: 'BookOpen', label: 'Education & Learning', Icon: BookOpen },
  { name: 'Zap', label: 'Tech & Action', Icon: Zap },
  { name: 'Heart', label: 'Lifestyle & Health', Icon: Heart },
  { name: 'Video', label: 'General Video', Icon: Video },
];

export function SectionIcon({
  name,
  className = 'h-4 w-4',
  style,
}: {
  name?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const iconKey = (name || '').toLowerCase().trim();

  switch (iconKey) {
    case 'film':
      return <Film className={className} style={style} />;
    case 'trophy':
      return <Trophy className={className} style={style} />;
    case 'sparkles':
      return <Sparkles className={className} style={style} />;
    case 'music':
      return <Music className={className} style={style} />;
    case 'gamepad2':
    case 'gamepad':
    case 'gaming':
      return <Gamepad2 className={className} style={style} />;
    case 'compass':
    case 'documentary':
      return <Compass className={className} style={style} />;
    case 'flame':
    case 'trending':
      return <Flame className={className} style={style} />;
    case 'tv':
    case 'series':
      return <Tv className={className} style={style} />;
    case 'globe':
    case 'news':
      return <Globe className={className} style={style} />;
    case 'clapperboard':
      return <Clapperboard className={className} style={style} />;
    case 'bookopen':
    case 'education':
      return <BookOpen className={className} style={style} />;
    case 'zap':
      return <Zap className={className} style={style} />;
    case 'heart':
      return <Heart className={className} style={style} />;
    case 'camera':
      return <Camera className={className} style={style} />;
    case 'radio':
      return <Radio className={className} style={style} />;
    default:
      return <Layers className={className} style={style} />;
  }
}
