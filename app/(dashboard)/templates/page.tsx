import { LayoutTemplate } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="font-display text-3xl text-[#1A1A1A] leading-none mb-8">Templates</h1>
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="p-4 bg-[#FFF0E6] rounded-full mb-4">
          <LayoutTemplate className="w-8 h-8 text-[#E85D04]" />
        </div>
        <p className="text-[#4A5568] font-medium">No templates yet.</p>
        <p className="text-sm text-[#A0AEC0] mt-1">Your saved message templates will appear here.</p>
      </div>
    </div>
  );
}
