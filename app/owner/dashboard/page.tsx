import CollapsibleSection from '@/components/owner/CollapsibleSection';

const SECTIONS = [
  { index: '🔗', title: 'Important Links',     accent: 'bg-info' },
  { index: '1',  title: 'Goals',               accent: 'bg-brown' },
  { index: '2',  title: 'Finance',             accent: 'bg-brown' },
  { index: '3',  title: 'Production',          accent: 'bg-brown' },
  { index: '4',  title: 'Weekly Performance',  accent: 'bg-brown' },
  { index: '5',  title: 'Monthly Performance', accent: 'bg-brown' },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gold px-3 py-4 pb-24 space-y-3">
      {SECTIONS.map(({ index, title, accent }) => (
        <CollapsibleSection key={title} index={index} title={title} accent={accent}>
          <div className="px-4 py-6 text-sm text-text-muted text-center">
            Coming soon…
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
