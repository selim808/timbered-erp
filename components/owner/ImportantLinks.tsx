const ExternalIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const SheetIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B86E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
  </svg>
);

const CloudIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B86E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 15a4 4 0 0 0 4 4h10a4 4 0 0 0 1.5-7.7A5 5 0 0 0 8.1 8 4 4 0 0 0 3 15z"/>
  </svg>
);

const AppIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B86E1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h10M7 12h6M7 16h4"/>
  </svg>
);

function Banner({ icon, title, sub, buttons }: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  buttons: { label: string; href: string }[];
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, background: '#fff',
      border: '1.5px solid #C8AA88', borderLeft: '4px solid #B86E1A',
      borderRadius: 12, padding: '12px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon}
        <div>
          <strong style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1C1A17' }}>{title}</strong>
          <span style={{ fontSize: 11, color: '#7A6F65' }}>{sub}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', flexShrink: 0 }}>
        {buttons.map(({ label, href }) => (
          <a
            key={label} href={href} target="_blank" rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#B86E1A', color: '#fff',
              fontSize: 13, fontWeight: 500,
              padding: '7px 14px', borderRadius: 8,
              textDecoration: 'none', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#7A4610')}
            onMouseLeave={e => (e.currentTarget.style.background = '#B86E1A')}
          >
            <ExternalIcon /> {label}
          </a>
        ))}
      </div>
    </div>
  );
}

export default function ImportantLinks() {
  return (
    <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Banner
        icon={<SheetIcon />}
        title="Google Spreadsheet"
        sub="All sheets & data sources"
        buttons={[{ label: 'Open', href: 'https://docs.google.com/spreadsheets/d/16FRyFmYhnjBXLQNkd4yehiaYfxPC252srClEuEMSlfc/edit' }]}
      />
      <Banner
        icon={<CloudIcon />}
        title="OneDrive"
        sub="Drawings & files"
        buttons={[{ label: 'Open', href: 'https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2YvYy8yYTljNmRlZTM2NzMwMTJkL0VpUXI2U2NLN0RKT294cEc0ZUhkaHdJQmVPYjktN0J3b2xKRHU3TU1zM3ByOVE%5FZT14UnpPQ2Q&id=2A9C6DEE3673012D%21s27e92b24ec0a4e32a31a46e1e1dd8702&cid=2A9C6DEE3673012D' }]}
      />
      <Banner
        icon={<AppIcon />}
        title="AppSheet"
        sub="Apps & data entry"
        buttons={[
          { label: 'Timbered', href: 'https://www.appsheet.com/start/831bfa0c-8b33-419d-9c73-8d17bd1c42f1?platform=mobile#appName=Timbered-230806548&view=Processing%20Orders' },
          { label: 'Finance',  href: 'https://www.appsheet.com/start/25809a9d-557f-43a0-8fac-14a212f85519?platform=mobile#appName=Accounting-Entry-548387873-25-08-20&view=Exp%20Buckets_Detail' },
        ]}
      />
    </div>
  );
}
