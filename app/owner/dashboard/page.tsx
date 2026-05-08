import CollapsibleSection from '@/components/owner/CollapsibleSection';
import ImportantLinks from '@/components/owner/ImportantLinks';
import GoalsSection from '@/components/owner/GoalsSection';
import FinanceSection from '@/components/owner/FinanceSection';
import ProductionSection from '@/components/owner/ProductionSection';
import WeeklySection from '@/components/owner/WeeklySection';
import MonthlySection from '@/components/owner/MonthlySection';

export default function DashboardPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 12px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <CollapsibleSection index="🔗" title="Important Links">
        <ImportantLinks />
      </CollapsibleSection>

      <CollapsibleSection index="1" title="Goals"><GoalsSection /></CollapsibleSection>
      <CollapsibleSection index="2" title="Finance"><FinanceSection /></CollapsibleSection>
      <CollapsibleSection index="3" title="Production"><ProductionSection /></CollapsibleSection>
      <CollapsibleSection index="4" title="Weekly Performance"><WeeklySection /></CollapsibleSection>
      <CollapsibleSection index="5" title="Monthly Performance"><MonthlySection /></CollapsibleSection>

    </div>
  );
}
