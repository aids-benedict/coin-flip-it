"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { CoinFlip } from "./CoinFlip";

interface OptionAnalysis {
  option: string;
  analysis: string;
  weight: number;
  bestCase?: string;
  worstCase?: string;
}

interface BiasAnalysis {
  biasDetected: boolean;
  biasType: "emotional" | "contradiction" | "both" | "none";
  biasMessage: string;
  emotionalScore: number;
}

interface DecisionResult {
  analysis: string;
  optionAnalyses: OptionAnalysis[];
  keyFactors: string[];
  result: string;
  recommendation: string;
  bias?: BiasAnalysis;
}

export function DecisionMaker() {
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);
  const [error, setError] = useState("");
  const [clarifyingQuestions, setClarifyingQuestions] = useState<string[]>([]);
  const [clarifyingAnswers, setClarifyingAnswers] = useState<string[]>([]);
  const [showClarifying, setShowClarifying] = useState(false);
  const [initialChoice, setInitialChoice] = useState<string>("");
  const [showInitialChoice, setShowInitialChoice] = useState(false);
  const [finalChoice, setFinalChoice] = useState<string>("");
  const [showFinalChoice, setShowFinalChoice] = useState(false);
  const [decisionId, setDecisionId] = useState<string>("");
  const [showRiskAnalysis, setShowRiskAnalysis] = useState(false);

  // Handle resuming in-progress decisions
  useEffect(() => {
    const resumeId = searchParams.get("resume");
    console.log("Resume ID from URL:", resumeId);
    if (resumeId) {
      console.log("Loading decision:", resumeId);
      loadDecision(resumeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  const loadDecision = async (id: string) => {
    try {
      setIsAnalyzing(true);
      const response = await fetch(`/api/decision/${id}`);

      if (!response.ok) {
        throw new Error("Failed to load decision");
      }

      const { decision } = await response.json();

      // Parse stored JSON fields
      const storedOptions = JSON.parse(decision.options);
      const storedWeights = JSON.parse(decision.weights);

      // Reconstruct the DecisionResult from stored data
      // Note: weights is stored as array of {option, weight} objects
      const optionAnalyses: OptionAnalysis[] = storedWeights.map((wObj: { option: string; weight: number }) => ({
        option: wObj.option,
        analysis: "", // Individual analyses aren't stored, only overall
        weight: wObj.weight,
      }));

      const decisionResult: DecisionResult = {
        analysis: decision.analysis,
        optionAnalyses,
        keyFactors: [], // Key factors aren't stored in DB
        result: decision.result,
        recommendation: decision.explanation,
      };

      // Restore state
      setQuestion(decision.question);
      setOptions(storedOptions);
      setResult(decisionResult);
      setInitialChoice(decision.initialChoice || "");
      setDecisionId(decision.id);
      setShowCoinFlip(true);

      // Clear the URL parameter
      window.history.replaceState({}, "", "/");
    } catch (err: any) {
      console.error("Failed to load decision:", err);
      setError("Failed to load decision. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setShowCoinFlip(false);

    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    const filledOptions = options.filter((opt) => opt.trim());
    if (filledOptions.length < 2) {
      setError("Please provide at least 2 options");
      return;
    }

    // Show initial choice selection
    setShowInitialChoice(true);
  };

  const handleInitialChoice = async (choice: string) => {
    setInitialChoice(choice);
    setShowInitialChoice(false);
    setIsAnalyzing(true);

    const filledOptions = options.filter((opt) => opt.trim());

    try {
      // Get clarifying questions
      const response = await fetch("/api/clarify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          options: filledOptions,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate questions");
      }

      const data = await response.json();
      // Extract questions and default answers
      const questions = data.questions.map((q: any) =>
        typeof q === "string" ? q : q.question
      );
      const defaultAnswers = data.questions.map((q: any) =>
        typeof q === "string" ? "" : (q.defaultAnswer || "")
      );

      setClarifyingQuestions(questions);
      setClarifyingAnswers(defaultAnswers);
      setShowClarifying(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsAnalyzing(true);

    const filledOptions = options.filter((opt) => opt.trim());

    try {
      // Build Q&A pairs
      const qaAnswers = clarifyingQuestions.map((q, i) => ({
        question: q,
        answer: clarifyingAnswers[i] || "Not specified",
      }));

      const response = await fetch("/api/decide", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question.trim(),
          options: filledOptions,
          clarifyingAnswers: qaAnswers,
          initialChoice: initialChoice,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to analyze decision");
      }

      const data = await response.json();
      setResult(data.decision);
      setDecisionId(data.decision.id);
      setShowClarifying(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFlipCoin = () => {
    setShowCoinFlip(true);
  };

  const handleFinalChoice = async (choice: string) => {
    setFinalChoice(choice);
    setShowFinalChoice(false);

    // Update the decision with final choice
    try {
      await fetch("/api/update-choice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          decisionId: decisionId,
          finalChoice: choice,
        }),
      });
    } catch (err) {
      console.error("Failed to update choice:", err);
    }
  };

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setResult(null);
    setShowCoinFlip(false);
    setError("");
    setClarifyingQuestions([]);
    setClarifyingAnswers([]);
    setShowClarifying(false);
    setInitialChoice("");
    setShowInitialChoice(false);
    setFinalChoice("");
    setShowFinalChoice(false);
    setDecisionId("");
    setShowRiskAnalysis(false);
  };

  const updateClarifyingAnswer = (index: number, value: string) => {
    const newAnswers = [...clarifyingAnswers];
    newAnswers[index] = value;
    setClarifyingAnswers(newAnswers);
  };

  // Initial choice selection (before analysis)
  if (showInitialChoice) {
    const filledOptions = options.filter((opt) => opt.trim());
    return (
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
            What are you leaning towards?
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Pick your gut feeling before seeing the analysis
          </p>

          <div className="space-y-3">
            {filledOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleInitialChoice(option)}
                className="w-full px-6 py-4 text-left border-2 border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-zinc-900 dark:text-zinc-50"
              >
                <div className="font-semibold">{option}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Final choice selection (after coin flip)
  if (showFinalChoice && result) {
    return (
      <div className="w-full max-w-3xl space-y-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
            What did you actually decide?
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Now that you've seen the analysis and coin flip, what's your final choice?
          </p>

          <div className="space-y-3">
            {result.optionAnalyses.map((optAnalysis, index) => (
              <button
                key={index}
                onClick={() => handleFinalChoice(optAnalysis.option)}
                className="w-full px-6 py-4 text-left border-2 border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {optAnalysis.option}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                      {optAnalysis.weight}% recommendation
                      {result.result === optAnalysis.option && " • 🎯 Coin flip result"}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (showClarifying) {
    return (
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg mb-6">
          <h2 className="text-2xl font-bold mb-2 text-zinc-900 dark:text-zinc-50">
            Help us understand your situation
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Answer these questions so we can provide better recommendations
          </p>

          <form onSubmit={handleFinalSubmit} className="space-y-6">
            {clarifyingQuestions.map((q, index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-50">
                  {q}
                </label>
                <textarea
                  value={clarifyingAnswers[index]}
                  onChange={(e) => updateClarifyingAnswer(index, e.target.value)}
                  placeholder="Your answer..."
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400"
                  rows={2}
                  disabled={isAnalyzing}
                />
              </div>
            ))}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={reset}
                disabled={isAnalyzing}
                className="px-6 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-lg transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:cursor-not-allowed"
              >
                Start Over
              </button>
              <button
                type="submit"
                disabled={isAnalyzing}
                className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
              >
                {isAnalyzing ? "Analyzing..." : "🪙 Flip It!"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="w-full max-w-3xl space-y-8">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-50">
            Analysis
          </h2>
          <p className="text-zinc-700 dark:text-zinc-300 mb-6">
            {result.analysis}
          </p>

          <div className="space-y-4 mb-6">
            {result.optionAnalyses.map((optAnalysis, i) => (
              <div
                key={i}
                className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {optAnalysis.option}
                  </h3>
                  <span className="text-sm font-medium px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                    {optAnalysis.weight}%
                  </span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {optAnalysis.analysis}
                </p>
              </div>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold mb-2 text-zinc-900 dark:text-zinc-50">
              Key Factors:
            </h3>
            <ul className="list-disc list-inside space-y-1 text-zinc-700 dark:text-zinc-300">
              {result.keyFactors.map((factor, i) => (
                <li key={i}>{factor}</li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => setShowRiskAnalysis(!showRiskAnalysis)}
            className="w-full py-3 px-4 border-2 border-blue-500 dark:border-blue-600 text-blue-600 dark:text-blue-400 font-semibold rounded-lg transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {showRiskAnalysis ? "Hide" : "Show"} Risk Scenarios 📊
          </button>

          {showRiskAnalysis && (
            <div className="mt-4 space-y-4">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">
                📊 Risk Awareness: Best & Worst Case Scenarios
              </h3>
              {result.optionAnalyses.map((optAnalysis, i) => (
                <div
                  key={i}
                  className="border-2 border-zinc-200 dark:border-zinc-700 rounded-lg p-4 space-y-3"
                >
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {optAnalysis.option}
                  </h4>

                  <div className="space-y-2">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-green-600 dark:text-green-400 text-xl flex-shrink-0">✅</span>
                        <div>
                          <div className="font-medium text-green-900 dark:text-green-200 text-sm mb-1">
                            Best Case:
                          </div>
                          <div className="text-sm text-green-800 dark:text-green-300">
                            {optAnalysis.bestCase || "No best case scenario provided"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 text-xl flex-shrink-0">⚠️</span>
                        <div>
                          <div className="font-medium text-red-900 dark:text-red-200 text-sm mb-1">
                            Worst Case:
                          </div>
                          <div className="text-sm text-red-800 dark:text-red-300">
                            {optAnalysis.worstCase || "No worst case scenario provided"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {result.bias && result.bias.biasDetected && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl flex-shrink-0">⚠️</div>
              <div>
                <h3 className="text-xl font-bold mb-2 text-amber-900 dark:text-amber-200">
                  Bias Detected
                </h3>
                <p className="text-amber-800 dark:text-amber-300 mb-3">
                  {result.bias.biasMessage}
                </p>
                <div className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
                  {result.bias.biasType === "emotional" || result.bias.biasType === "both" ? (
                    <p>• Found {result.bias.emotionalScore} emotional keyword{result.bias.emotionalScore !== 1 ? 's' : ''} in your answers</p>
                  ) : null}
                  {result.bias.biasType === "contradiction" || result.bias.biasType === "both" ? (
                    <p>• Your initial choice ({initialChoice}) differs from the top recommendation</p>
                  ) : null}
                </div>
                <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <p className="text-sm text-amber-900 dark:text-amber-200">
                    <strong>Recommendation:</strong> Take a moment to reflect on whether your emotions or cognitive biases might be influencing your decision. The coin flip can help break ties or overcome analysis paralysis.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showCoinFlip && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg">
            <button
              onClick={handleFlipCoin}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              🪙 Flip the Coin!
            </button>
          </div>
        )}

        {showCoinFlip && (
          <CoinFlip
            options={result.optionAnalyses.map((oa) => oa.option)}
            weights={result.optionAnalyses.map((oa) => oa.weight)}
            result={result.result}
          />
        )}

        {showCoinFlip && !finalChoice && !showFinalChoice && (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg">
            <button
              onClick={() => setShowFinalChoice(true)}
              className="w-full py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Make Your Final Decision →
            </button>
          </div>
        )}

        {showCoinFlip && finalChoice && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-8 shadow-lg border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="text-5xl">✅</div>
              <h2 className="text-3xl font-bold text-green-800 dark:text-green-200">
                Decision Made!
              </h2>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 mb-6 border-2 border-green-300 dark:border-green-700 shadow-md">
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wide">
                  Your Final Choice
                </span>
              </div>
              <div className="text-2xl font-bold text-center text-green-900 dark:text-green-100">
                {finalChoice}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💭</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                      Initial Gut Feeling
                    </div>
                    <div className="text-base font-medium text-blue-900 dark:text-blue-100">
                      {initialChoice}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide mb-1">
                      Coin Flip Result
                    </div>
                    <div className="text-base font-medium text-purple-900 dark:text-purple-100">
                      {result.result}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border-2 border-green-400 dark:border-green-600">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✨</span>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide mb-1">
                      What You Actually Chose
                    </div>
                    <div className="text-base font-bold text-green-900 dark:text-green-100">
                      {finalChoice}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-5 mb-6 border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🤖</span>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                  AI's Opinion:
                </h3>
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
                {result.recommendation}
              </p>
            </div>

            <button
              onClick={reset}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg"
            >
              🎯 Make Another Decision
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="question"
            className="block text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-50"
          >
            What are you trying to decide?
          </label>
          <textarea
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Should I take Job A or Job B?"
            className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400"
            rows={3}
            disabled={isAnalyzing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-zinc-900 dark:text-zinc-50">
            Your options:
          </label>
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400"
                  disabled={isAnalyzing}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    disabled={isAnalyzing}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 5 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              disabled={isAnalyzing}
            >
              + Add another option
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 text-white font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isAnalyzing ? "Analyzing..." : "🪙 Flip It!"}
        </button>
      </form>
    </div>
  );
}
