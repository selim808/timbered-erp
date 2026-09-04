import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import UnlockForm from '@/components/extras/UnlockForm';
import { getExtraPage } from '@/lib/extras';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const page = await getExtraPage(slug);
  if (!page) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-5">
      <div className="w-full max-w-xs">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-2 flex items-baseline gap-2">
            <p className="font-serif text-3xl text-brown">Timbered</p>
            <span className="rounded-full bg-brown px-2 py-0.5 text-xs font-bold tracking-widest text-gold-light">
              ERP
            </span>
          </div>
          <p className="text-sm font-semibold text-text">{page.title}</p>
          <p className="mt-1 text-xs text-text-muted">Enter the password to open this page</p>
        </div>

        <UnlockForm slug={slug} />
      </div>
    </div>
  );
}
