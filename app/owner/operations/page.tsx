'use client';

import Link from 'next/link';

interface Tool {
  label: string;
  description: string;
  href: string;
  ready: boolean;
  /** optional — falls back to a generic "+" icon */
  icon?: React.ReactNode;
  /** true for plain .html files served from /public (opens in a new tab) */
  external?: boolean;
}

interface Section {
  title: string;
  tools: Tool[];
  /** shown instead of the list when tools is empty */
  emptyHint?: string;
}

const sections: Section[] = [
  {
    title: 'Sales',
    tools: [
      {
        label: 'Orders',
        description: 'Browse incoming orders and their current status',
        href: '/owner/pipeline/orders',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        ),
      },
      {
        label: 'Order Review',
        description: 'Check and confirm new orders before planning',
        href: '/owner/pipeline/review',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Production',
    tools: [
      {
        label: 'Phases',
        description: 'Manage phase groups and phase definitions',
        href: '/owner/phases',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M4 6h16M4 10h16M4 14h10M4 18h6" />
          </svg>
        ),
      },
      {
        label: 'Job Orders',
        description: 'Create and track production job orders',
        href: '/owner/pipeline/job-orders',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: 'Cut List',
        description: 'Generate and manage cutting schedules',
        href: '/owner/pipeline/job-orders/cutlist',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
          </svg>
        ),
      },
      {
        label: 'Production Kanban',
        description: 'Visual board of orders across production phases',
        href: '/owner/operations/production-kanban',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Warehouse',
    tools: [
      {
        label: 'Stockcount',
        description: 'Update stock and defected quantities per product',
        href: '/employee/stockcount',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Logistics',
    tools: [
      {
        label: 'Shipments',
        description: 'Track outgoing shipments and carriers',
        href: '/owner/operations/shipments',
        ready: false,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        ),
      },
      {
        label: 'Delivery',
        description: 'Manage last-mile delivery and confirmations',
        href: '/owner/operations/delivery',
        ready: false,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2m-4-1v8m0 0l-3-3m3 3l3-3" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Customer',
    tools: [
      {
        label: 'Customer Service',
        description: 'Handle follow-ups, complaints, and feedback',
        href: '/owner/operations/customer-service',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        ),
      },
      {
        label: 'Cancellation Reasons',
        description: 'Manage the reason list used when cancelling orders',
        href: '/owner/operations/cancellation-reasons',
        ready: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'Extras',
    emptyHint: 'No extra pages yet — add one below and it shows up here.',
    tools: [
      // Add extra pages here. Two ways:
      //  1. A Next route:   href: '/owner/operations/my-page'
      //  2. A quick static HTML file in /public/extras/my-page.html:
      //     href: '/extras/my-page.html', external: true
      {
        label: 'Nursery Outreach',
        description: 'Call & WhatsApp list for nurseries and preschools',
        href: '/extras/nursery-outreach.html',
        ready: true,
        external: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        ),
      },
    ],
  },
];

const extraIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

export default function DepartmentsPage() {
  return (
    <div className="min-h-screen bg-background pb-28 pt-4 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 px-1">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.tools.length === 0 && section.emptyHint && (
                <div className="bg-surface border border-dashed border-border rounded-xl px-4 py-5 text-center">
                  <p className="text-xs text-text-muted">{section.emptyHint}</p>
                </div>
              )}
              {section.tools.map(tool => (
                tool.ready ? (
                  tool.external ? (
                    <a
                      key={tool.label}
                      href={tool.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3.5 hover:border-brown hover:bg-surface-2 transition-colors group"
                    >
                      <span className="text-brown group-hover:scale-110 transition-transform">
                        {tool.icon ?? extraIcon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text">{tool.label}</p>
                        <p className="text-xs text-text-muted truncate">{tool.description}</p>
                      </div>
                      <svg className="w-4 h-4 text-border group-hover:text-brown transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M14 5h5m0 0v5m0-5L10 14M19 14v5a1 1 0 01-1 1H6a1 1 0 01-1-1V7a1 1 0 011-1h5" />
                      </svg>
                    </a>
                  ) : (
                  <Link
                    key={tool.label}
                    href={tool.href}
                    className="flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3.5 hover:border-brown hover:bg-surface-2 transition-colors group"
                  >
                    <span className="text-brown group-hover:scale-110 transition-transform">
                      {tool.icon ?? extraIcon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text">{tool.label}</p>
                      <p className="text-xs text-text-muted truncate">{tool.description}</p>
                    </div>
                    <svg className="w-4 h-4 text-border group-hover:text-brown transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  )
                ) : (
                  <div
                    key={tool.label}
                    className="flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3.5 opacity-50 cursor-not-allowed"
                  >
                    <span className="text-text-muted">{tool.icon ?? extraIcon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text">{tool.label}</p>
                      <p className="text-xs text-text-muted truncate">{tool.description}</p>
                    </div>
                    <span className="text-xs text-text-muted flex-shrink-0 font-medium">Soon</span>
                  </div>
                )
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
