"use client"

import { useState } from "react";
import { addProductsLogic } from "@/lib/actions/settings";
import { Plus } from "lucide-react";

export default function ProductsInventory() {
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "",
      price: "",
      averageRepurchaseDays: "",
      isReplenishable: "",
    },
  ]);

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: Date.now(),
        name: "",
        price: "",
        averageRepurchaseDays: "",
        isReplenishable: "",
      },
    ]);
  };

  const removeProduct = (id: number) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  const updateProduct = (id: number, field: string, value: string) => {
    setProducts(
      products.map((product) =>
        product.id === id ? { ...product, [field]: value } : product
      )
    );
  };

  const totalValue = products.reduce(
    (sum, product) => sum + (parseFloat(product.price) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#FAFAF8] p-8">
      <form className="max-w-3xl mx-auto" action={addProductsLogic}>
        <h1 className="font-display font-extrabold tracking-tight text-3xl lg:text-4xl text-[#1A1A1A] mb-2">Products &amp; Inventory</h1>
        <p className="text-[#4A5568] mb-8">
          Manage your products and repurchase behavior.
        </p>

        <div className="space-y-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 relative hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition"
            >
              <button
                type="button"
                onClick={() => removeProduct(product.id)}
                className="absolute top-4 right-4 text-sm font-medium text-[#A0AEC0] hover:text-[#DC2626] transition-colors"
              >
                Remove
              </button>

              <div className="space-y-5">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1.5">
                    Product Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={product.name}
                    onChange={(e) =>
                      updateProduct(product.id, "name", e.target.value)
                    }
                    className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1.5">
                    Price (₦)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={product.price}
                    onChange={(e) =>
                      updateProduct(product.id, "price", e.target.value)
                    }
                    className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
                  />
                </div>

                {/* Repurchase Time */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1.5">
                    Average Repurchase Time (Days)
                  </label>
                  <input
                    type="number"
                    name="repurchase_time"
                    value={product.averageRepurchaseDays}
                    onChange={(e) =>
                      updateProduct(
                        product.id,
                        "averageRepurchaseDays",
                        e.target.value
                      )
                    }
                    className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
                  />
                </div>

                {/* Replenishable */}
                <div>
                  <label className="block text-sm font-medium text-[#4A5568] mb-1.5">
                    Is this Replenishable?
                  </label>
                  <select
                    name="isReplenishable"
                    value={product.isReplenishable}
                    onChange={(e) =>
                      updateProduct(
                        product.id,
                        "isReplenishable",
                        e.target.value
                      )
                    }
                    className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
                  >
                    <option value="">Select Option</option>
                    <option value="true">
                      Yes, Customers buy repeatedly
                    </option>
                    <option value="false">
                      No, One-time purchase
                    </option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={addProduct}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E8E8E4] bg-white text-sm font-semibold text-[#1A1A1A] hover:border-[#E85D04] hover:text-[#E85D04] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Another Product
          </button>
        </div>

        <div className="mt-10 bg-white rounded-2xl border border-[#E8E8E4] shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6">
          <h2 className="text-xs font-semibold text-[#A0AEC0] uppercase tracking-widest mb-3">Inventory Summary</h2>
          <div className="flex justify-between py-1 text-sm"><span className="text-[#4A5568]">Total Products</span><span className="font-mono font-bold text-[#1A1A1A]">{products.length}</span></div>
          <div className="flex justify-between py-1 text-sm"><span className="text-[#4A5568]">Total Inventory Value</span><span className="font-mono font-bold text-[#1A1A1A]">₦{totalValue.toLocaleString()}</span></div>
        </div>

        <button
          type="submit"
          className="mt-8 bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 rounded-xl py-3.5 w-full text-white font-semibold transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)]"
        >
          Add to Database
        </button>
      </form>
    </div>
  );
}
