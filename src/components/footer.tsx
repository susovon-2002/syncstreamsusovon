'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const Logo = () => (
    <Image
        src="/syncstream-logo.png"
        alt="SyncStream logo"
        width={36}
        height={36}
        className="h-9 w-9 rounded-sm object-cover"
    />
);

export function Footer() {
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="mt-auto border-t border-white/10 bg-background/35 px-4 py-12 text-foreground/80 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-8">
        <div className="col-span-1 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-foreground">
                <Logo />
                <span className="font-headline tricolor-text">SyncStream</span>
            </Link>
            <div className='mt-4 space-y-2 text-sm'>
                <p className='font-semibold'>Contact Us</p>
                <p>support@syncstream.in</p>
            </div>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-4">Company</h3>
          <ul className="space-y-2">
            <li><Link href="/about" className="transition-colors hover:text-[#ff9933]">About Us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-4">Resources</h3>
          <ul className="space-y-2">
            <li><Link href="/support" className="transition-colors hover:text-[#ff9933]">Support</Link></li>
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold text-foreground mb-4">Legal</h3>
          <ul className="space-y-2">
            <li><Link href="/privacy" className="transition-colors hover:text-[#ff9933]">Privacy Statement</Link></li>
            <li><Link href="/terms" className="transition-colors hover:text-[#ff9933]">Terms of Use</Link></li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto mt-10 border-t border-white/10 pt-6 text-center">
        <p className="text-sm text-foreground/60">
            &copy; {currentYear || '...'} SyncStream. All Rights Reserved.
        </p>
        <p className="text-sm text-foreground/60 mt-2">
            Made with ❤️ in India
        </p>
      </div>
    </footer>
  );
}
