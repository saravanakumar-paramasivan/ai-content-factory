'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Clapperboard, LogOut, Youtube, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { YouTubeStatus } from '@/types';
import { cn } from '@/lib/utils';

interface NavbarProps {
  youtubeStatus?: YouTubeStatus | null;
}

export function Navbar({ youtubeStatus }: NavbarProps) {
  const ytConnected = youtubeStatus?.connected && !youtubeStatus?.expired;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-80 transition-opacity">
          <Clapperboard className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">AI Content Factory</span>
          <span className="sm:hidden">ACF</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* YouTube status */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Youtube className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">YouTube</span>
            <span className={cn('h-2 w-2 rounded-full', ytConnected ? 'bg-emerald-500' : 'bg-red-500')} />
          </div>

          {/* Sign out */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <span className="hidden sm:inline text-xs">admin</span>
            <ChevronDown className="h-3.5 w-3.5 hidden sm:inline" />
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
