import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.FINANCE_API_URL;
  if (!url) return NextResponse.json({ error: 'FINANCE_API_URL not configured' }, { status: 500 });

  try {
    const res  = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
