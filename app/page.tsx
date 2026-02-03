import { Suspense } from "react";
import { DecisionMaker } from "@/components/DecisionMaker";
import { MobileNav } from "@/components/MobileNav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center md:justify-between h-16 items-center relative">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              🪙 Coin Flip It
            </h1>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {user.email}
              </span>
              <a
                href="/history"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 font-medium"
              >
                📚 History
              </a>
              <form action="/api/auth/signout" method="post" className="inline">
                <button
                  type="submit"
                  className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                >
                  Sign Out
                </button>
              </form>
            </div>
            {/* Mobile Navigation */}
            <MobileNav userEmail={user.email} />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col items-center space-y-8">
          <div className="text-center space-y-4 max-w-2xl">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              AI-Powered Decision Assistant
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Can't decide? Let AI analyze your options and flip a smart coin
              for you.
            </p>
          </div>

          <Suspense fallback={<div className="text-zinc-600 dark:text-zinc-400">Loading...</div>}>
            <DecisionMaker />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
