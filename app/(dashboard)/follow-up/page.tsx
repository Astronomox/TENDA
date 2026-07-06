import React from "react";
import { getFollowUpRecommendations } from "@/lib/algorithm/salesEngine";
import { MessageCircle, Phone } from "lucide-react";

const FollowUpPage = async () => {
  const followUps = await getFollowUpRecommendations();

  // 🔥 Split data
  const overdue = followUps
    .filter((item) => item.status === "overdue")
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const dueSoon = followUps.filter(
    (item) => item.status === "due_soon"
  );

  return (
    <div className="px-4 py-6 lg:px-0 lg:py-0 space-y-6">
      <h1 className="font-display font-extrabold text-3xl lg:text-4xl text-[#1A1A1A] leading-none tracking-tight">Follow-ups</h1>

      {/* OVERDUE */}
      <div>
        <h3 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
          Overdue ({overdue.length})
        </h3>

        {overdue.length > 0 ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {overdue.map((item, i) => (
              <div
                key={i}
                className="relative bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#DC2626]" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">
                      {item.customerName}
                    </p>
                    <p className="text-sm text-[#4A5568]">
                      {item.productName}
                    </p>
                  </div>
                  <span className="bg-[#FFF0E6] text-[#DC2626] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                    {item.daysOverdue}d overdue
                  </span>
                </div>

                <div className="mt-3 text-xs text-[#A0AEC0] space-y-0.5 font-mono">
                  <p>
                    Last bought: {new Date(item.lastPurchase).toDateString()}
                  </p>
                  <p>
                    Expected: {new Date(item.nextExpected).toDateString()}
                  </p>
                </div>

                {/* 🔥 Action buttons (future: WhatsApp / call) */}
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-1.5 bg-[#E85D04] hover:bg-[#FF8C42] text-white text-sm font-semibold px-3 py-2.5 rounded-lg transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                  <button className="flex items-center justify-center gap-1.5 border border-[#E8E8E4] text-[#4A5568] hover:border-[#E85D04] hover:text-[#E85D04] text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors">
                    <Phone className="w-4 h-4" />
                    Call
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#A0AEC0] text-sm">
            No overdue customers
          </p>
        )}
      </div>

      {/* DUE SOON */}
      <div>
        <h3 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#D97706]" />
          Due Soon ({dueSoon.length})
        </h3>

        {dueSoon.length > 0 ? (
          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
            {dueSoon.map((item, i) => (
              <div
                key={i}
                className="relative bg-white p-4 rounded-xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden"
              >
                <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#D97706]" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">
                      {item.customerName}
                    </p>
                    <p className="text-sm text-[#4A5568]">
                      {item.productName}
                    </p>
                  </div>
                  <span className="bg-amber-50 text-[#D97706] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                    Due soon
                  </span>
                </div>

                <div className="mt-3 text-xs text-[#A0AEC0] space-y-0.5 font-mono">
                  <p>
                    Last bought: {new Date(item.lastPurchase).toDateString()}
                  </p>
                  <p>
                    Expected: {new Date(item.nextExpected).toDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#A0AEC0] text-sm">
            No upcoming follow-ups
          </p>
        )}
      </div>
    </div>
  );
};

export default FollowUpPage;
