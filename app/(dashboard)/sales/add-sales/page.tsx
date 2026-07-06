"use client";


import { useState } from "react";
import CustomerAutocomplete from "@/components/CustomerAutocomplete";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import { AddSalesLogic } from "@/lib/actions/sales";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";


export default function AddSales() {
  const [customer, setCustomer] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);

  


  return (
    <div className="flex flex-col w-full px-4 py-6">
      {/* HEADER ROW */}
      <div className="relative flex items-center justify-center mb-8">
        <Link href="/sales" className="absolute left-0 flex items-center gap-1 text-sm font-medium text-[#4A5568] hover:text-[#1A1A1A] transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <h1 className="font-display text-2xl text-[#1A1A1A]">Log Sale</h1>
      </div>


      <form action={AddSalesLogic} className="flex flex-col w-full gap-5">


        {/* Customer */}
        <div className="flex flex-col w-full">
          <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Customer name</label>
          <CustomerAutocomplete onSelect={setCustomer} />
          {customer && (
            <>
              <p className="text-sm mt-2 text-[#16A34A] font-medium">
                Selected: {customer.name}
              </p>
              <input
                type="hidden"
                name="customer_name"
                value={customer.name}
              />
            </>
          )}
        </div>


        {/* Product */}
        <div className="flex flex-col w-full">
          <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Product name</label>
          <ProductAutocomplete onSelect={setProduct} />
          {product && (
            <>
              <p className="text-sm mt-2 text-[#16A34A] font-medium">
                Selected: {product.name}
              </p>
              <input
                type="hidden"
                name="product_name"
                value={product.name}
              />
              <input
                type="hidden"
                name="price"
                value={product.price}
              />
            </>
          )}
        </div>


        {/* Units */}
        <div className="flex flex-col w-full">
          <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Units</label>
          <input
            type="number"
            name="unit"
            required
            className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] placeholder:text-[#A0AEC0] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
          />
        </div>


        {/* Submit */}
        <button
          type="submit"
          className="bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 text-white font-semibold rounded-xl h-14 w-full transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)] mt-2"
        >
          Record Sale
        </button>


      </form>
    </div>
  );
}
