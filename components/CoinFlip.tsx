"use client";

import { useState, useEffect } from "react";

interface CoinFlipProps {
  options: string[];
  weights: number[];
  result: string;
}

export function CoinFlip({ options, weights, result }: CoinFlipProps) {
  const [isFlipping, setIsFlipping] = useState(true);
  const [flipCount, setFlipCount] = useState(0);
  const [currentSide, setCurrentSide] = useState(0);

  // Get a random non-result option for the other side
  const otherOption = options.find((opt) => opt !== result) || options[0];

  useEffect(() => {
    // Flip the coin multiple times
    const interval = setInterval(() => {
      setFlipCount((prev) => prev + 1);
    }, 600);

    // Stop after ~3 seconds (5 flips) and land on result
    setTimeout(() => {
      clearInterval(interval);
      setIsFlipping(false);
      // Make sure we end on the result side
      setCurrentSide(0);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const rotation = isFlipping ? flipCount * 180 : 0;

  return (
    <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-12 shadow-2xl">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-white text-lg font-medium">
          {isFlipping ? "Flipping..." : "Result:"}
        </div>

        {/* 3D Coin Flip Container */}
        <div className="perspective-1000">
          <div
            className="relative w-48 h-48 transition-transform duration-600 ease-in-out preserve-3d"
            style={{
              transform: `rotateY(${rotation}deg)`,
              transformStyle: "preserve-3d",
            }}
          >
            {/* Front side - Result */}
            <div
              className="absolute inset-0 w-48 h-48 flex items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-2xl backface-hidden"
              style={{
                backfaceVisibility: "hidden",
              }}
            >
              <div className="text-center p-6">
                <div className="text-6xl mb-2">🎯</div>
                <div className="text-lg font-bold text-zinc-900 break-words">
                  {result}
                </div>
              </div>
            </div>

            {/* Back side - Other option */}
            <div
              className="absolute inset-0 w-48 h-48 flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-500 rounded-full shadow-2xl backface-hidden"
              style={{
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
              }}
            >
              <div className="text-center p-6">
                <div className="text-6xl mb-2">🪙</div>
                <div className="text-lg font-bold text-zinc-900 break-words">
                  {otherOption}
                </div>
              </div>
            </div>
          </div>
        </div>

        {!isFlipping && (
          <div className="text-center space-y-2 animate-fade-in">
            <div className="text-white text-2xl font-bold">
              Your answer: {result}
            </div>
            <div className="text-white/80 text-sm">
              Based on {weights[options.indexOf(result)]}% probability
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .duration-600 {
          transition-duration: 600ms;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
