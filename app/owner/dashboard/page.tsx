import CollapsibleSection from '@/components/owner/CollapsibleSection';
import ImportantLinks from '@/components/owner/ImportantLinks';
import GoalsSection from '@/components/owner/GoalsSection';
import FinanceSection from '@/components/owner/FinanceSection';

const PLACEHOLDER = (
  <div style={{ padding: '32px 16px', textAlign: 'center', fontSize: 13, color: '#7A6F65' }}>
    Coming soon…
  </div>
);

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 12px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <CollapsibleSection index="🔗" title="Important Links">
        <ImportantLinks />
      </CollapsibleSection>

      <CollapsibleSection index="1" title="Goals"><GoalsSection /></CollapsibleSection>
      <CollapsibleSection index="2" title="Finance"><FinanceSection /></CollapsibleSection>
      <CollapsibleSection index="3" title="Production">{PLACEHOLDER}</CollapsibleSection>
      <CollapsibleSection index="4" title="Weekly Performance">{PLACEHOLDER}</CollapsibleSection>
      <CollapsibleSection index="5" title="Monthly Performance">{PLACEHOLDER}</CollapsibleSection>

    </div>
  );
}
