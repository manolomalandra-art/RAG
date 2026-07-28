import dynamic from "next/dynamic";

const MainClient = dynamic(() => import("@/components/MainClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  ),
});

export default function Home() {
  return <MainClient />;
}
