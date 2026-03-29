"use client";

import { useState } from "react";
import { Mail, Copy, Check } from "lucide-react";

interface AdvocacyLetterProps {
  zipCode: string;
  reiScore: number;
  filterType: string;
}

export default function AdvocacyLetter({
  zipCode,
  reiScore,
  filterType,
}: AdvocacyLetterProps) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const actionTier =
    reiScore < 33
      ? "monitoring my water quality"
      : reiScore < 67
        ? "implementation of stronger PFAS disclosure requirements"
        : "immediate action to reduce PFAS levels in municipal water supplies";

  const letterContent = `Subject: PFAS Contamination Concerns — ZIP ${zipCode}

Dear Representative,

I am a constituent in ZIP ${zipCode}. Recent EPA data shows my water supply contains PFAS at a level that gives me a Relative Exposure Index of ${reiScore}/100. My current water filter (${filterType}) ${
    filterType === "none"
      ? "is not certified for PFAS removal"
      : "is NSF certified for PFAS removal"
  }.

As a resident concerned about public health, I am requesting your support for ${actionTier} and stronger protections against PFAS contamination.

Thank you for your attention to this critical health issue.

Sincerely,
${userName || "[Your Name]"}
${userEmail || "[Your Email]"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(letterContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEmail = () => {
    const mailto = `mailto:?subject=PFAS%20Contamination%20Concerns%20-%20ZIP%20${zipCode}&body=${encodeURIComponent(letterContent)}`;
    window.open(mailto);
  };

  return (
    <div className="w-full">
      <h3 className="font-bold text-gray-100 mb-6 text-xl flex items-center gap-2">
        <Mail className="w-5 h-5 text-emerald-400" />
        Advocacy Letter to Representatives
      </h3>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            Your Name
          </label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/60 border border-slate-500 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            placeholder="Jane Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2">
            Your Email
          </label>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700/60 border border-slate-500 text-gray-100 placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
            placeholder="jane@example.com"
          />
        </div>
      </div>

      {/* Letter Preview */}
      <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-6 mb-6 max-h-48 overflow-y-auto">
        <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
          {letterContent}
        </pre>
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold hover:from-emerald-600 hover:to-teal-600 transition-all active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy to Clipboard
            </>
          )}
        </button>

        <button
          onClick={handleEmail}
          className="flex items-center gap-2 px-4 py-3 bg-slate-700 text-gray-100 rounded-xl font-bold hover:bg-slate-600 transition-all active:scale-95"
        >
          <Mail className="w-4 h-4" />
          Open in Mail App
        </button>
      </div>

      <p className="text-xs text-gray-400 mt-4 italic leading-relaxed">
        💡 Pro tip: Edit the letter to include your local representatives&apos; names and addresses for maximum impact.
      </p>
    </div>
  );
}
