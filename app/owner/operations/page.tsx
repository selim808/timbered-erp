'use client';

import Link from 'next/link';

interface Tool {
  label: string;
  description: string;
  href: string;
  ready: boolean;
  icon: React.ReactNode;
}

interface Section {
  title: string;
  tools: Tool[];
}

const sections: Section[] = [
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
        ready: false,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        ),
      },
    ],
  },
];

export default function OperationsPage() {
  return (
    <div className="min-h-screen bg-background pb-28 pt-4 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {sections.map(section => (
          <div key={section.title}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3 px-1">
              {section.title}
            </h2>
            <div className="space-y-2">
              {section.tools.map(tool => (
                tool.ready ? (
                  <Link
                    key={tool.label}
                    href={tool.href}
                    className="flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3.5 hover:border-brown hover:bg-surface-2 transition-colors group"
                  >
                    <span className="text-brown group-hover:scale-110 transition-transform">
                      {tool.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text">{tool.label}</p>
                      <p className="text-xs text-text-muted truncate">{tool.description}</p>
                    </div>
                    <svg className="w-4 h-4 text-border group-hover:text-brown transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <div
                    key={tool.label}
                    className="flex items-center gap-4 bg-surface border border-border rounded-xl px-4 py-3.5 opacity-50 cursor-not-allowed"
                  >
                    <span className="text-text-muted">{tool.icon}</span>
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
