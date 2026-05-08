import { redirect } from 'next/navigation';

export default function ProductionRedirect() {
  redirect('/owner/production');
}
