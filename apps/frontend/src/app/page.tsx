"use client";

import InputForm from "@/components/inputs/InputForm";
import ForeverScaleGauge from "@/components/gauge/ForeverScaleGauge";
import { useAppStore } from "@/store/appStore";
import { Leaf, Shield, CheckCircle, Clock, Zap } from "lucide-react";

export default function Home() {
  const { reiScore, zipCode, filterModel, cookwareUse, dietHabits, makeUpUse } = useAppStore();
  const displayScore = reiScore ?? 0;

  // Check if user has entered all required data
  const isDataComplete = 
    /^\d{5}$/.test(zipCode) &&
    filterModel?.type &&
    cookwareUse !== null &&
    dietHabits !== null &&
    makeUpUse !== null;

  const getStatus = (score: number): string => {
    if (score < 33) return "safe";
    if (score < 67) return "caution";
    return "danger";
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900">
      {/* Simplified Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 py-12 md:py-20 px-4">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-600 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-900/50 border border-teal-700 rounded-full mb-4">
            <Leaf className="w-4 h-4 text-teal-400" />
            <span className="text-sm font-semibold text-teal-300">Personalized Health Assessment</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-200 bg-clip-text text-transparent mb-3 leading-tight">
            BioBound
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Discover your PFAS exposure risk and get actionable steps to protect your health
          </p>
        </div>
      </div>

      {/* Main Content - Mobile First */}
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-16">
        <div className="grid lg:grid-cols-4 gap-6 md:gap-8">
          {/* Form Section - Full width on mobile, 2.5/4 on desktop */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 border border-teal-700/30">
              <InputForm />
            </div>
          </div>

          {/* Sidebar - Stacks below on mobile, right on desktop */}
          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            {/* Score Card - Only show when data is complete */}
            {isDataComplete && (
              <div className="bg-gradient-to-br from-teal-900/60 to-emerald-900/60 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-teal-600/50 lg:sticky lg:top-8 animate-in fade-in duration-500">
                <h2 className="text-lg font-bold text-gray-100 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-400" />
                  Your REI Score
                </h2>
                <ForeverScaleGauge
                  score={displayScore}
                  status={getStatus(displayScore)}
                />
                <p className="text-xs text-gray-400 text-center mt-4 italic">
                  Updates after analysis complete
                </p>
              </div>
            )}

            {/* Info Cards - Compact on mobile */}
            <div className="space-y-3">
              <div className="bg-teal-900/40 rounded-xl p-3 md:p-4 border border-teal-700/30 hover:border-teal-600/50 transition-colors">
                <h3 className="font-semibold text-gray-100 mb-2 flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-teal-400" />
                  Time Needed
                </h3>
                <p className="text-xs md:text-sm text-gray-300">
                  <span className="font-semibold text-teal-300">3-5 minutes</span> to complete
                </p>
              </div>

              <div className="bg-emerald-900/40 rounded-xl p-3 md:p-4 border border-emerald-700/30 hover:border-emerald-600/50 transition-colors">
                <h3 className="font-semibold text-gray-100 mb-2 flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  What We Check
                </h3>
                <ul className="text-xs md:text-sm text-gray-300 space-y-0.5">
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" /> Water quality</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" /> Cookware use</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" /> Diet habits</li>
                  <li className="flex items-center gap-2"><CheckCircle className="w-3 h-3 text-emerald-400" /> Personal care</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-teal-700/30 bg-slate-900/40 backdrop-blur-sm mt-12 md:mt-20 py-6 md:py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-xs md:text-sm text-gray-400">
          <p>Powered by EPA data • Science-backed insights • Private & anonymous</p>
        </div>
      </footer>
    </main>
  );
}
