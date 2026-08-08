import React from "react";

interface FollowUpPromptProps {
  missingFields: string[];
  onClickField: (field: string) => void;
}

const FIELD_LABELS: Record<string, string> = {
  destination: "Destination",
  country: "Country",
  startdate: "Start Date",
  enddate: "End Date",
  budget: "Budget",
  currency: "Currency",
  travelercount: "Number of Travelers",
  travelertype: "Travel Style",
  interests: "Interests",
  duration: "Trip Duration",
};

export const FollowUpPrompt: React.FC<FollowUpPromptProps> = ({ missingFields, onClickField }) => {
  if (missingFields.length === 0) return null;

  return (
    <div className="p-3 rounded-2xl bg-brand-50/60 border border-brand-100">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-700 mb-2">
        We still need a few details
      </p>
      <div className="flex flex-wrap gap-1.5">
        {missingFields.map((field) => (
          <button
            key={field}
            onClick={() => onClickField(field)}
            className="px-2.5 py-1.5 rounded-full bg-white hover:bg-brand-600 hover:text-white border border-brand-200 text-brand-700 text-xs font-bold transition-all duration-200 cursor-pointer active:scale-95"
          >
            + {FIELD_LABELS[field] || field}
          </button>
        ))}
      </div>
    </div>
  );
};
