'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';
import { useFirebase } from '@/firebase';
import { Button } from './ui/button';
import { UserNav } from './auth/user-nav';

type HeaderProps = HTMLAttributes<HTMLElement>;

const Logo = () => (
    <Image
        src="/syncstream-logo.png"
        alt="SyncStream logo"
        width={40}
        height={40}
        priority
        className="h-10 w-10 rounded-sm object-cover"
    />
);


export function Header({ className, children, ...props }: HeaderProps) {
  const { user, isUserLoading } = useFirebase();

  return (
    <header className={cn("sticky top-0 z-50 border-b border-white/10 bg-background/40 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8", className)} {...props}>
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
          <Logo />
          <span className="font-headline tricolor-text">SyncStream</span>
        </Link>
        <div className="flex items-center gap-4">
          {children}
          {!isUserLoading && (
            user && !user.isAnonymous ? (
              <UserNav />
            ) : (
              <Button asChild className="bg-gradient-to-r from-[#ff9933] via-white to-[#138808] font-bold text-[#07142c] hover:scale-[1.02]">
                <Link href="/login">Sign In</Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
