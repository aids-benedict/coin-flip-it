"use client";

import { useEffect, useState } from "react";
import { useSupabase } from "@/components/Providers";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { MobileNav } from "@/components/MobileNav";

interface Decision {
  id: string;
  question: string;
  options: string[];
  result: string;
  initialChoice: string | null;
  finalChoice: string | null;
  analysis: string;
  explanation: string;
  weights: Array<{ option: string; weight: number }>;
  clarifyingAnswers: Array<{ question: string; answer: string }> | null;
  createdAt: string;
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useSupabase();
  const router = useRouter();
  const { showToast, showConfirm } = useToast();
  const supabase = createClient();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "in-progress">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      fetchHistory();
    }
  }, [user, authLoading, router]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/history");

      if (!response.ok) {
        throw new Error("Failed to fetch history");
      }

      const data = await response.json();
      setDecisions(data.decisions);
    } catch (err) {
      setError("Failed to load decision history");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return "Today";
    } else if (diffInDays === 1) {
      return "Yesterday";
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  };

  const handleDeleteDecision = async (id: string) => {
    showConfirm("Are you sure you want to delete this decision?", async () => {
      try {
        setDeletingId(id);
        const response = await fetch(`/api/decision/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete decision");
        }

        // Refresh the list
        await fetchHistory();
        showToast("Decision deleted successfully", "success");
      } catch (err) {
        console.error("Delete error:", err);
        showToast("Failed to delete decision", "error");
      } finally {
        setDeletingId(null);
      }
    });
  };

  const handleBulkDeleteInProgress = async () => {
    const inProgressCount = decisions.filter((d) => !d.finalChoice).length;

    if (inProgressCount === 0) {
      return;
    }

    showConfirm(
      `Are you sure you want to delete all ${inProgressCount} in-progress decision${inProgressCount !== 1 ? 's' : ''}?`,
      async () => {
        try {
          setBulkDeleting(true);
          const response = await fetch("/api/decision/bulk-delete", {
            method: "POST",
          });

          if (!response.ok) {
            throw new Error("Failed to delete decisions");
          }

          // Refresh the list
          await fetchHistory();
          showToast(`Deleted ${inProgressCount} in-progress decision${inProgressCount !== 1 ? 's' : ''}`, "success");
        } catch (err) {
          console.error("Bulk delete error:", err);
          showToast("Failed to delete decisions", "error");
        } finally {
          setBulkDeleting(false);
        }
      }
    );
  };

  const handleCopyToClipboard = async (decision: Decision) => {
    const text = formatDecisionAsText(decision);
    try {
      await navigator.clipboard.writeText(text);
      showToast("Decision copied to clipboard!", "success");
    } catch (err) {
      console.error("Failed to copy:", err);
      showToast("Failed to copy to clipboard", "error");
    }
  };

  const handleExportAsJSON = (decision: Decision) => {
    const dataStr = JSON.stringify(decision, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `decision-${decision.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAsText = (decision: Decision) => {
    const text = formatDecisionAsText(decision);
    const dataBlob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `decision-${new Date(decision.createdAt).toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatDecisionAsText = (decision: Decision): string => {
    const date = new Date(decision.createdAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    let text = `COIN FLIP IT - DECISION SUMMARY\n`;
    text += `${"=".repeat(50)}\n\n`;
    text += `Date: ${date}\n\n`;
    text += `QUESTION:\n${decision.question}\n\n`;
    text += `OPTIONS:\n${decision.options.map((opt, i) => `  ${i + 1}. ${opt}`).join("\n")}\n\n`;

    if (decision.initialChoice) {
      text += `INITIAL GUT FEELING:\n${decision.initialChoice}\n\n`;
    }

    text += `ANALYSIS:\n${decision.analysis}\n\n`;

    if (decision.weights && decision.weights.length > 0) {
      text += `AI RECOMMENDATION WEIGHTS:\n`;
      decision.weights.forEach((w) => {
        text += `  • ${w.option}: ${w.weight}%\n`;
      });
      text += `\n`;
    }

    text += `COIN FLIP RESULT:\n${decision.result}\n\n`;

    if (decision.explanation) {
      text += `AI'S OPINION:\n${decision.explanation}\n\n`;
    }

    if (decision.finalChoice) {
      text += `YOUR FINAL DECISION:\n${decision.finalChoice}\n\n`;

      // Add insight about what influenced the decision
      const finalLower = decision.finalChoice.toLowerCase().trim();
      const initialLower = decision.initialChoice?.toLowerCase().trim();
      const coinLower = decision.result.toLowerCase().trim();
      const topAI = decision.weights.reduce((prev, current) =>
        current.weight > prev.weight ? current : prev
      );
      const aiLower = topAI.option.toLowerCase().trim();

      text += `DECISION INSIGHT:\n`;
      if (finalLower === initialLower) {
        text += `You followed your gut feeling.\n`;
      }
      if (finalLower === aiLower) {
        text += `You followed the AI's top recommendation.\n`;
      }
      if (finalLower === coinLower) {
        text += `You followed the coin flip result.\n`;
      }
      if (finalLower !== initialLower && finalLower !== aiLower && finalLower !== coinLower) {
        text += `You made an independent choice, different from your gut, AI, and coin.\n`;
      }
    } else {
      text += `STATUS: In Progress (No final decision made yet)\n`;
    }

    text += `\n${"=".repeat(50)}\n`;
    text += `Generated by Coin Flip It - AI-Powered Decision Assistant\n`;

    return text;
  };

  // Calculate decision statistics
  const calculateStats = () => {
    const completedDecisions = decisions.filter((d) => d.finalChoice);
    const total = completedDecisions.length;

    if (total === 0) {
      return {
        total: 0,
        inProgress: decisions.length,
        followedGut: 0,
        followedAI: 0,
        followedCoin: 0,
        gutPercentage: 0,
        aiPercentage: 0,
        coinPercentage: 0,
      };
    }

    let followedGut = 0;
    let followedAI = 0;
    let followedCoin = 0;

    completedDecisions.forEach((decision) => {
      const finalChoice = decision.finalChoice?.toLowerCase().trim();
      const initialChoice = decision.initialChoice?.toLowerCase().trim();
      const coinResult = decision.result.toLowerCase().trim();

      // Find AI's top recommendation
      const topAIRecommendation = decision.weights.reduce((prev, current) =>
        current.weight > prev.weight ? current : prev
      );
      const aiChoice = topAIRecommendation.option.toLowerCase().trim();

      // Check matches
      if (finalChoice === initialChoice) followedGut++;
      if (finalChoice === aiChoice) followedAI++;
      if (finalChoice === coinResult) followedCoin++;
    });

    return {
      total,
      inProgress: decisions.filter((d) => !d.finalChoice).length,
      followedGut,
      followedAI,
      followedCoin,
      gutPercentage: Math.round((followedGut / total) * 100),
      aiPercentage: Math.round((followedAI / total) * 100),
      coinPercentage: Math.round((followedCoin / total) * 100),
    };
  };

  const stats = calculateStats();

  // Filter and sort decisions
  const filteredAndSortedDecisions = decisions
    .filter((decision) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesQuestion = decision.question.toLowerCase().includes(query);
        const matchesOptions = decision.options.some((opt) =>
          opt.toLowerCase().includes(query)
        );
        if (!matchesQuestion && !matchesOptions) {
          return false;
        }
      }

      // Filter by status
      if (filterStatus === "completed" && !decision.finalChoice) {
        return false;
      }
      if (filterStatus === "in-progress" && decision.finalChoice) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400 text-lg">
            Loading your decision history...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
            Error Loading History
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">{error}</p>
          <button
            onClick={fetchHistory}
            className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Navigation Bar */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center md:justify-between h-16 items-center relative">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              🪙 Coin Flip It
            </h1>
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-4">
              <a
                href="/"
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 font-medium"
              >
                🪙 New Decision
              </a>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                {user?.email}
              </span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/login');
                }}
                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
              >
                Sign Out
              </button>
            </div>
            {/* Mobile Navigation */}
            <MobileNav userEmail={user?.email} />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-12 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              📚 Decision History
            </h2>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Review your past decisions and see how you&apos;ve chosen over time
          </p>
        </div>

        {/* Decision Stats */}
        {stats.total > 0 && (
          <div className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 rounded-2xl p-6 shadow-lg mb-8 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="text-3xl">📊</div>
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  Decision Patterns
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  How you make decisions over time
                </p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {decisions.length}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Total Decisions
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {stats.total}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Completed
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.inProgress}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  In Progress
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round((stats.total / Math.max(decisions.length, 1)) * 100)}%
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Completion Rate
                </div>
              </div>
            </div>

            {/* Pattern Analysis */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                What influences your final decisions?
              </h3>

              {/* Gut Feeling */}
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💭</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Gut Feeling
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {stats.gutPercentage}%
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {stats.followedGut} of {stats.total}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.gutPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                  Times your final choice matched your initial gut feeling
                </p>
              </div>

              {/* AI Recommendation */}
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      AI Recommendation
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {stats.aiPercentage}%
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {stats.followedAI} of {stats.total}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div
                    className="bg-purple-600 dark:bg-purple-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.aiPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                  Times your final choice matched the top AI recommendation
                </p>
              </div>

              {/* Coin Flip Result */}
              <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🪙</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Coin Flip Result
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {stats.coinPercentage}%
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {stats.followedCoin} of {stats.total}
                    </div>
                  </div>
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5">
                  <div
                    className="bg-amber-600 dark:bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${stats.coinPercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
                  Times your final choice matched the weighted coin flip
                </p>
              </div>
            </div>

            {/* Insight */}
            {stats.gutPercentage > 60 && (
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-semibold text-blue-900 dark:text-blue-200 mb-1">
                      Insight: You Trust Your Gut
                    </div>
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      You follow your initial instinct {stats.gutPercentage}% of the time. The analysis helps validate what you already know!
                    </div>
                  </div>
                </div>
              </div>
            )}
            {stats.aiPercentage > 60 && stats.gutPercentage <= 60 && (
              <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-semibold text-purple-900 dark:text-purple-200 mb-1">
                      Insight: You Value Logic
                    </div>
                    <div className="text-sm text-purple-800 dark:text-purple-300">
                      You follow the AI's logical analysis {stats.aiPercentage}% of the time. You let data guide your decisions!
                    </div>
                  </div>
                </div>
              </div>
            )}
            {stats.coinPercentage > 50 && stats.gutPercentage < 50 && stats.aiPercentage < 50 && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                      Insight: You Embrace Uncertainty
                    </div>
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      You follow the coin flip {stats.coinPercentage}% of the time. You're comfortable letting chance break the tie!
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters and Search */}
        {decisions.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg mb-6">
            {/* Search Bar */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="🔍 Search decisions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              />
            </div>

            {/* Filter and Sort Controls */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Status Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterStatus("all")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  All ({decisions.length})
                </button>
                <button
                  onClick={() => setFilterStatus("completed")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === "completed"
                      ? "bg-green-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  Completed ({decisions.filter((d) => d.finalChoice).length})
                </button>
                <button
                  onClick={() => setFilterStatus("in-progress")}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterStatus === "in-progress"
                      ? "bg-yellow-600 text-white"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  In Progress ({decisions.filter((d) => !d.finalChoice).length})
                </button>
              </div>

              {/* Sort Dropdown */}
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest")}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>

            {/* Results Count */}
            {(searchQuery || filterStatus !== "all") && (
              <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                Showing {filteredAndSortedDecisions.length} of {decisions.length} decisions
              </div>
            )}

            {/* Bulk Delete Button for In Progress */}
            {filterStatus === "in-progress" && decisions.filter((d) => !d.finalChoice).length > 0 && (
              <div className="mt-4">
                <button
                  onClick={handleBulkDeleteInProgress}
                  disabled={bulkDeleting}
                  className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {bulkDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      🗑️ Delete All In Progress ({decisions.filter((d) => !d.finalChoice).length})
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Decisions List */}
        {decisions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 shadow-lg text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              No Decisions Yet
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Start making decisions to see your history here!
            </p>
            <button
              onClick={() => router.push("/")}
              className="py-3 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all"
            >
              Make Your First Decision
            </button>
          </div>
        ) : filteredAndSortedDecisions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-12 shadow-lg text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              No Decisions Found
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Try adjusting your search or filters
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterStatus("all");
              }}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedDecisions.map((decision) => (
              <div
                key={decision.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
              >
                {/* Question and Date */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex-1">
                    {decision.question}
                  </h3>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                    {formatDate(decision.createdAt)}
                  </span>
                </div>

                {/* Options */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                    Options:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {decision.options.map((option, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Decision Journey */}
                {decision.finalChoice && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {decision.initialChoice && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                        <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                          💭 Initial Gut
                        </div>
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          {decision.initialChoice}
                        </div>
                      </div>
                    )}
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                      <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">
                        🎯 Coin Flip
                      </div>
                      <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                        {decision.result}
                      </div>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                      <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">
                        ✨ Final Choice
                      </div>
                      <div className="text-sm font-bold text-green-900 dark:text-green-100">
                        {decision.finalChoice}
                      </div>
                    </div>
                  </div>
                )}

                {!decision.finalChoice && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800 mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-yellow-800 dark:text-yellow-300">
                        ⏳ Decision in progress - no final choice recorded yet
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/?resume=${decision.id}`)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors flex items-center gap-1"
                          title="Resume and finish this decision"
                        >
                          ▶️ Resume
                        </button>
                        <button
                          onClick={() => handleDeleteDecision(decision.id)}
                          disabled={deletingId === decision.id}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded transition-colors disabled:cursor-not-allowed flex items-center gap-1"
                          title="Delete this decision"
                        >
                          {deletingId === decision.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            "🗑️"
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Recommendation */}
                {decision.explanation && (
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700 mb-4">
                    <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide mb-2">
                      🤖 AI&apos;s Opinion:
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-3">
                      {decision.explanation}
                    </p>
                  </div>
                )}

                {/* Export/Share Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <button
                    onClick={() => handleCopyToClipboard(decision)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Copy decision summary to clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => handleExportAsText(decision)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Download as text file"
                  >
                    📄 Text
                  </button>
                  <button
                    onClick={() => handleExportAsJSON(decision)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-zinc-600 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    title="Download as JSON file"
                  >
                    💾 JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
