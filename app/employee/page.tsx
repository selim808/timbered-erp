import Link from 'next/link';

const PAGES = [
  { href: '/employee/stockcount', label: 'Stockcount', icon: '📦', desc: 'View and update product stock levels' },
];

export default function EmployeePage() {
  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f0eb; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8ddd4', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://timberedgroup.com/wp-content/uploads/2024/04/Asset-14.png" alt="Timbered" style={{ height: 26 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#7A4610' }}>Employee Portal</span>
      </div>

      {/* Grid */}
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {PAGES.map(p => (
          <Link key={p.href} href={p.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: 14, border: '1px solid #e8ddd4',
              padding: '20px 14px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10, textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 36 }}>{p.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#7A4610' }}>{p.label}</span>
              <span style={{ fontSize: 11, color: '#a07040', lineHeight: 1.4 }}>{p.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
