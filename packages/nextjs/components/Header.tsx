"use client";

import React from "react";
import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/helper";

export const Header = () => {
  return (
    <header className="sticky top-0 z-50 h-11 bg-apple-black flex items-center justify-between px-6 md:px-10">
      <nav className="flex items-center gap-6">
        <Link href="/" className="text-white text-sm font-semibold tracking-tight">
          Cipher
        </Link>
        <a href="#how-it-works" className="hidden md:block text-white/80 text-xs hover:text-white transition-colors">
          How it Works
        </a>
        <a href="#dashboard" className="hidden md:block text-white/80 text-xs hover:text-white transition-colors">
          Dashboard
        </a>
        <a href="#pool" className="hidden md:block text-white/80 text-xs hover:text-white transition-colors">
          Pool
        </a>
      </nav>
      <div className="flex items-center">
        <RainbowKitCustomConnectButton />
      </div>
    </header>
  );
};
