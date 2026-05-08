export const metadata = {
  title: 'admin — obscurus labs',
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-[#0A0A0A] text-[#EDEDED]">{children}</div>;
}
