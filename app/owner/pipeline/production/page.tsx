import { redirect } from 'next/navigation';

export default function PipelineProductionPage() {
  redirect('/owner/operations/production-kanban');
}
