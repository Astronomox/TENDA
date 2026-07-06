"use client";

import React from "react";
import { BarChart2, Users, AlertTriangle, TrendingUp, FileText, Calendar, RefreshCw, DollarSign } from "lucide-react";

interface QuickCommand {
  icon: React.ElementType;
  label: string;
  prompt: string;
}

const COMMANDS: QuickCommand[] = [
  { icon: BarChart2,     label: "Sales performance",   prompt: "Analyze my sales performance this month"   },
  { icon: Users,         label: "Customer summary",    prompt: "Summarize my top customers this week"       },
  { icon: AlertTriangle, label: "Churn risks",         prompt: "Which customers are at risk of leaving?"    },
  { icon: TrendingUp,    label: "Growth opportunities",prompt: "What growth opportunities do you see?"      },
  { icon: FileText,      label: "Draft a proposal",    prompt: "Help me draft a customer proposal"          },
  { icon: Calendar,      label: "Weekly summary",      prompt: "Give me a summary of this week's business"  },
  { icon: RefreshCw,     label: "Repeat buyers",       prompt: "Which products drive repeat purchases?"     },
  { icon: DollarSign,    label: "Revenue breakdown",   prompt: "Break down my revenue by category"          },
];

interface QuickCommandGridProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export default function QuickCommandGrid({ onSelect, disabled }: QuickCommandGridProps) {
  return (
    <section className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#A0AEC0] mb-3">
        Quick commands
      </h2>

      <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 scrollbar-none">
        {COMMANDS.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => onSelect(cmd.prompt)}
            disabled={disabled}
            className="
              flex-shrink-0 sm:flex-shrink
              flex items-center gap-2.5 text-left
              bg-white border border-[#E8E8E4] rounded-xl px-3 py-2.5
              hover:border-[#E85D04] hover:bg-[#FFF7F0]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all group w-48 sm:w-auto
            "
          >
            <cmd.icon className="w-4 h-4 flex-shrink-0 text-[#E85D04]" />
            <span className="text-xs font-semibold text-[#4A5568] group-hover:text-[#E85D04] transition-colors leading-snug">
              {cmd.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
