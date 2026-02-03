"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

interface MobileNavProps {
  userEmail?: string | null;
}

export function MobileNav({ userEmail }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply blur to page content when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      // Only blur the main content area, not nav
      const main = document.querySelector('main');
      if (main) {
        (main as HTMLElement).style.filter = 'blur(8px)';
        (main as HTMLElement).style.transition = 'filter 0.3s ease';
      }

      // Blur only the content section on history page (if not wrapped in main)
      const contentDiv = document.querySelector('.min-h-screen > div:not(nav)');
      if (contentDiv && !contentDiv.querySelector('main')) {
        (contentDiv as HTMLElement).style.filter = 'blur(8px)';
        (contentDiv as HTMLElement).style.transition = 'filter 0.3s ease';
      }
    } else {
      document.body.style.overflow = '';
      // Remove blur from all elements
      const allElements = document.querySelectorAll('[style*="blur"]');
      allElements.forEach((el) => {
        (el as HTMLElement).style.filter = '';
      });
    }
  }, [isOpen]);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Button - Hidden when menu is open */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden absolute right-4 p-2 text-zinc-700 dark:text-zinc-300"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Portal the overlay and menu directly to body */}
      {mounted && isOpen && createPortal(
        <>
          {/* Dark Overlay with Blur */}
          <div
            className="fixed inset-0 bg-black/30 z-[9998] md:hidden"
            style={{
              backdropFilter: 'blur(15px)',
              WebkitBackdropFilter: 'blur(15px)',
            }}
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar Menu - Solid Background */}
          <div
            className="fixed top-0 right-0 h-full w-72 z-[9999] md:hidden shadow-2xl flex flex-col"
            style={{ backgroundColor: '#ffffff', isolation: 'isolate', willChange: 'transform' }}
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Menu</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* User Email */}
            {userEmail && (
              <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                <div className="text-xs text-zinc-700 dark:text-zinc-400 mb-1">Signed in as</div>
                <div className="text-sm font-bold text-black dark:text-white truncate">{userEmail}</div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex-1 p-4 space-y-3 bg-white dark:bg-zinc-800">
              <button
                onClick={() => handleNavigation("/")}
                className="w-full p-4 rounded-lg text-left font-semibold text-white transition-all border border-blue-300 dark:border-blue-600"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.9)' }}
              >
                <span className="text-2xl mr-3">🪙</span>
                New Decision
              </button>

              <button
                onClick={() => handleNavigation("/history")}
                className="w-full p-4 rounded-lg text-left font-semibold text-white transition-all border border-purple-300 dark:border-purple-600"
                style={{ backgroundColor: 'rgba(168, 85, 247, 0.9)' }}
              >
                <span className="text-2xl mr-3">📚</span>
                History
              </button>
            </div>

            {/* Sign Out Button */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
              <a
                href="/api/auth/signout"
                className="w-full p-4 rounded-lg text-left font-semibold text-white block transition-all border border-red-300 dark:border-red-600"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}
              >
                <span className="text-2xl mr-3">🚪</span>
                Sign Out
              </a>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
