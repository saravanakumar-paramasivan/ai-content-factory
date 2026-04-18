'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Clapperboard, LogOut, Youtube, ChevronDown, BarChart2, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { YouTubeStatus } from '@/types';
import { cn } from '@/lib/utils';

interface NavbarProps {
  youtubeStatus?: YouTubeStatus | null;
}

export function Navbar({ youtubeStatus }: NavbarProps) {
  const pathname = usePathname();
  const ytConnected = youtubeStatus?.connected && !youtubeStatus?.expired;

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/trending', label: 'Trending', icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { href: '/dashboard/analytics', label: 'Analytics', icon: <BarChart2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 flex h-14 items-center justify-between">
        {/* Logo + Nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold text-foreground hover:opacity-80 transition-opacity">
            <Clapperboard className="h-5 w-5 text-primary" />
            <span className="hidden sm:inline">AI Content Factory</span>
            <span className="sm:hidden">ACF</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

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
