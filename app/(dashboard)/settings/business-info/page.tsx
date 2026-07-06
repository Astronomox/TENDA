import Link from "next/link";
export default function BusinessConfiguration() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex justify-center px-4 py-12 text-[#1A1A1A]">
      <form className="w-full max-w-md bg-white border border-[#E8E8E4] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] p-6 space-y-8">


        {/* Header */}
        <div className="space-y-1">
          <h1 className="font-display font-extrabold tracking-tight text-2xl lg:text-3xl text-[#1A1A1A]">
            Business Configuration
          </h1>
          <p className="text-sm text-[#4A5568]">
            Teach TENDA how your business sells
          </p>
        </div>


        {/* Identity */}
        <section className="space-y-4">
          <h2 className="text-xs uppercase tracking-widest text-[#A0AEC0] font-semibold">
            Identity
          </h2>


          <div>
            <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Business Name</label>
            <input
              defaultValue="Tenda Bags"
              className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition"
            />
          </div>


          <div>
            <label className="text-sm font-medium text-[#4A5568] mb-1.5 block">Currency</label>
            <select className="w-full h-12 bg-white border border-[#E8E8E4] rounded-xl px-4 text-sm text-[#1A1A1A] focus:outline-none focus:border-[#E85D04] focus:ring-2 focus:ring-[#E85D04]/10 transition">
              <option>NGN</option>
            </select>
          </div>
        </section>


       
        {/* Save */}
        <button className="w-full bg-[#E85D04] hover:bg-[#FF8C42] active:scale-95 text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-[0_4px_20px_rgba(232,93,4,0.25)]">
          Save Changes
        </button>

      <Link href="/settings/business-structure" className="block text-center text-sm font-semibold text-[#E85D04] hover:text-[#FF8C42] transition-colors">Next</Link>
      </form>
    </div>
  );
}
