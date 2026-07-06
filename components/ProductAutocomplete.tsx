"use client";


import { useEffect, useState } from "react";


interface Product {
  id: string;
  product_name: string;
  price: number;
}


interface Props {
  onSelect: (product: Product) => void;
}


export default function ProductAutocomplete({ onSelect }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }


    const debounce = setTimeout(async () => {
      setLoading(true);


      const res = await fetch(
        `/api/search-products?q=${encodeURIComponent(searchTerm)}`
      );


      const data = await res.json();
      setResults(data);
      setLoading(false);
    }, 300);


    return () => clearTimeout(debounce);
  }, [searchTerm]);


  function handleSelect(product: Product) {
    setSearchTerm(product.product_name);
    setResults([]);
    onSelect(product);
  }


  return (
    <div className="relative w-full">
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search product..."
        className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
      />


      {loading && (
        <div className="absolute z-20 bg-white border border-[#E8E8E4] w-full mt-1 rounded-xl px-4 py-3 text-sm text-[#A0AEC0]">
          Loading...
        </div>
      )}


      {results.length > 0 && (
        <div className="absolute z-20 bg-white border border-[#E8E8E4] w-full mt-1 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden">
          {results.map((product) => (
            <div
              key={product.id}
              onClick={() => handleSelect(product)}
              className="px-4 py-3 cursor-pointer hover:bg-[#FFF0E6] transition-colors"
            >
              <div className="font-medium text-[#1A1A1A]">{product.product_name}</div>
              <div className="text-sm text-[#4A5568] font-mono">
                ₦{product.price}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
