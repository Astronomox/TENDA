export default function DashboardLoading() {
  return (
    <div className="space-y-4 px-4 py-6 lg:px-0" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-[#F0F0EC]" />
      <div className="h-32 animate-pulse rounded-2xl bg-[#F0F0EC]" />
      <div className="h-20 animate-pulse rounded-2xl bg-[#F0F0EC]" />
      <div className="h-20 animate-pulse rounded-2xl bg-[#F0F0EC]" />
    </div>
  );
}
