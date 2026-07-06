import Link from "next/link"
export default function BusinessIntent(){
    return(
    <div className="min-h-screen bg-[#FAFAF8] flex justify-center px-4 py-12 text-[#1A1A1A]">
      <form className="w-full max-w-md bg-white border border-[#E8E8E4] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-8">
      
       <div className="space-y-1">
         <p className="font-display font-extrabold tracking-tight text-2xl lg:text-3xl text-[#1A1A1A]">Business Intent</p>
         <p className="text-sm text-[#4A5568]">What is the primary goal for your business</p>
       </div>


        <section className="space-y-2">
             {["grow revenue", "repeat customers", "move inventory", "stabilize"].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition text-sm capitalize"
                >
                  <input type="radio" name="channel" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}

        </section>

        <section className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">Customer style</p>
            {["one time", "repeat heavy", "relationship based", "stabilize"].map((item) => (
                <label
                  key={item}
                  className="flex items-center gap-3 bg-white border border-[#E8E8E4] rounded-xl px-4 py-3 cursor-pointer hover:border-[#E85D04] transition text-sm capitalize"
                >
                  <input type="radio" name="channel" className="accent-[#E85D04]" />
                  {item}
                </label>
              ))}

        </section>


        {/* Save */}
        <button className="w-full bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)]">
          Save Changes
        </button>

      <Link href="/settings/business-structure" className="block text-center text-sm font-semibold text-[#E85D04] hover:text-[#FF8C42] transition-colors">Next</Link>
      </form>
    </div>
    )
}
