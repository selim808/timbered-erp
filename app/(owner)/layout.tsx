import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const isOwner = cookieStore.get('owner_session')?.value === 'true';
  if (!isOwner) redirect('/login');
  return <>{children}</>;
}
