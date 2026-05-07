import CollapsibleSection from '@/components/owner/CollapsibleSection';

const SECTIONS = [
  { index: '🔗', title: 'Important Links' },
  { index: '1',  title: 'Goals' },
  { index: '2',  title: 'Finance' },
  { index: '3',  title: 'Production' },
  { index: '4',  title: 'Weekly Performance' },
  { index: '5',  title: 'Monthly Performance' },
];

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 12px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {SECTIONS.map(({ index, title }) => (
        <CollapsibleSection key={title} index={index} title={title}>
          <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>
            Coming soon…
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}
