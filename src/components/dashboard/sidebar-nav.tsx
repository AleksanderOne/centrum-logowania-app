'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutGrid, User, History, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClaLogo } from '@/components/cla-logo';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function SidebarNav({ className, user, ...props }: SidebarNavProps) {
  const pathname = usePathname();

  const items = [
    {
      title: 'Nowy Projekt',
      href: '/dashboard/new-project',
      icon: Plus,
      isGreen: true,
    },
    {
      title: 'Projekty',
      href: '/dashboard',
      icon: LayoutGrid,
    },
    {
      title: 'Logi Audytu',
      href: '/dashboard/audit',
      icon: History,
    },
    {
      title: 'Użytkownik',
      href: '/dashboard/user',
      icon: User,
    },
  ];

  return (
    <nav className={cn('flex flex-col h-full border-r bg-card', className)} {...props}>
      {/* Logo */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-primary">
          <ClaLogo size={32} />
          <span>Centrum</span>
        </Link>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 space-y-2">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const isGreen = 'isGreen' in item && item.isGreen;

          if (isGreen) {
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-2 relative overflow-hidden transition-all duration-300',
                  'border border-emerald-500/30 hover:border-emerald-500/50',
                  'bg-emerald-500/10 hover:bg-emerald-500/20',
                  'text-emerald-600 dark:text-emerald-400',
                  'hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]',
                  isActive && [
                    'bg-emerald-500/25 border-emerald-500/60',
                    'shadow-[0_0_20px_rgba(16,185,129,0.4)]',
                    'text-emerald-700 dark:text-emerald-300',
                  ]
                )}
              >
                <Link href={item.href}>
                  <item.icon
                    className={cn(
                      'w-4 h-4 transition-transform duration-300',
                      isActive && 'animate-pulse'
                    )}
                    suppressHydrationWarning
                  />
                  {item.title}
                </Link>
              </Button>
            );
          }

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn('w-full justify-start gap-2', isActive && 'bg-secondary')}
            >
              <Link href={item.href}>
                <item.icon className="w-4 h-4" suppressHydrationWarning />
                {item.title}
              </Link>
            </Button>
          );
        })}
      </div>

      {/* User Info & Footer Actions */}
      <div className="p-4 border-t space-y-4">
        <div className="flex items-center gap-3 px-2">
          <Avatar>
            <AvatarImage src={user.image || ''} />
            <AvatarFallback>{user.name?.[0] || user.email?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium leading-none truncate">{user.name || 'Użytkownik'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      </div>
    </nav>
  );
}
