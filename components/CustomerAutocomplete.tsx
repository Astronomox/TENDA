"use client";


import { useState } from "react";


export default function CustomerAutocomplete({ onSelect }: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);


  let debounce: any;


  function handleChange(value: string) {
    setQuery(value);


    clearTimeout(debounce);


    debounce = setTimeout(async () => {
      if (!value) return setResults([]);


      setLoading(true);


      const res = await fetch(`/api/search-customers?q=${value}`);
      const data = await res.json();


      setResults(data);
      setLoading(false);
    }, 300);
  }


  return (
    <div className="relative w-full">
      <input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search customer..."
        className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
      />


      {results.length > 0 && (
        <div className="absolute z-20 bg-white border border-[#E8E8E4] w-full mt-1 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
          {results.map((c) => (
            <div
              key={c.id}
              className="px-4 py-3 text-sm text-[#1A1A1A] hover:bg-[#FFF0E6] cursor-pointer transition-colors"
              onClick={() => {
                setQuery(c.name);
                setResults([]);
                onSelect(c);
              }}
            >
              {c.name}
            </div>
          ))}
        </div>
      )}


      {loading && <div className="text-xs text-[#A0AEC0] p-2">Searching...</div>}
    </div>
  );
}
