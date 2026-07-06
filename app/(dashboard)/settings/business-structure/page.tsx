import Link from "next/link"

export default function BusinessStructure(){
    return(
        <div className="flex flex-col py-12 px-4 bg-[#FAFAF8] min-h-screen">

          <p className="font-display font-extrabold tracking-tight text-2xl lg:text-3xl text-[#1A1A1A] mb-8">Business Structure</p>

          <form className="flex flex-col space-y-10">
          {/* Business Type */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">
              Business Type
            </h2>


            <div className="space-y-2 text-sm">
              {[
                "Fashion / Clothing",
                "Food / Consumables",
                "Beauty / Personal Care",
                "Services",
                "General Retail",
                "Other",
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition"
                >
                  <input type="radio" name="businessType" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}
            </div>
          </section>


          {/* Sales Rhythm */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">
              Sales Rhythm
            </h2>
            <p className="text-xs text-[#4A5568]">How often do you customers purchase your products or serices</p>


            <div className="space-y-2 text-sm">
              {["Weekly", "Every 2 weeks", "Monthly", "Irregular"].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition"
                >
                  <input type="radio" name="salesRhythm" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}


              <div className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3">
                <input type="radio" name="salesRhythm" className="accent-[#E85D04]" />
                <span>Custom →</span>
                <input
                  defaultValue="21"
                  className="w-14 bg-white border border-[#E8E8E4] rounded-md px-2 py-1 text-sm focus:outline-none focus:border-[#E85D04]"
                />
                <span className="text-[#4A5568]">days</span>
              </div>
            </div>


            <p className="text-xs text-[#A0AEC0]">
              TENDA uses this to predict when customers are ready to buy.
            </p>
          </section>


          {/* Sales Channel */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">
              Primary Sales Channel
            </h2>


            <div className="space-y-2 text-sm">
              {["WhatsApp", "Phone", "In-person", "Mixed"].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition"
                >
                  <input type="radio" name="channel" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}
            </div>
          </section>


        


          {/* Communication Style */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">
              Communication Style
            </h2>


            <div className="space-y-2 text-sm">
              {[
                "Friendly / casual",
                "Professional / direct",
                "Warm / relationship-focused",
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition"
                >
                  <input type="radio" name="tone" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}
            </div>


            <p className="text-xs text-[#A0AEC0]">
              This shapes suggested follow-up messages.
            </p>
          </section>


          {/* Price Range */}
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">
              Typical Purchase Size
            </h2>


            <div className="space-y-2 text-sm">
              {[
                "Low (frequent small buys)",
                "Medium",
                "High (larger, less frequent)",
              ].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition"
                >
                  <input type="radio" name="priceRange" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}
            </div>
          </section>

          <button className="w-full bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)]">
          Save Changes
        </button>

          </form>

          <Link href="/settings/products-offered" className="block text-center text-sm font-semibold text-[#E85D04] hover:text-[#FF8C42] transition-colors mt-4">Next page</Link>
        </div>
    )
}
