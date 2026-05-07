import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import DashHeader from '@/components/owner/DashHeader';
import BottomNav from '@/components/owner/BottomNav';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isOwner = cookieStore.get('owner_session')?.value === 'true';
  if (!isOwner) redirect('/login');

  return (
    <div className="min-h-screen bg-cream">
      <DashHeader />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
