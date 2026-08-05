import type { PhaseGroup, Phase } from '@/components/shared/PipelineOrderCard';

// ─── Predefined phase snapshot ───────────────────────────────────────────────
// Phases & phase-groups change rarely. The app renders from this predefined
// snapshot (and a localStorage copy the owner refreshes via the "Load new
// phases" button on the dashboard) instead of hitting the DB on every page.
// Regenerate by tapping "Load new phases" — that overwrites the cached copy;
// this file is the offline / first-load fallback.
// Last snapshot: 2026-08-05.

export const PREDEFINED_PHASE_GROUPS: PhaseGroup[] = [
  { id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'Review',      sort_order: 10, color: '#16A34A' },
  { id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'Planning',    sort_order: 20, color: '#16A34A' },
  { id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Production',  sort_order: 30, color: '#2563EB' },
  { id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'Repair',      sort_order: 40, color: '#2563EB' },
  { id: '0dbb5fde-04f8-4dc8-be03-db4799b84d9d', name: 'Dispatch',    sort_order: 50, color: '#2563EB' },
  { id: '3d8878fc-e81c-42f8-8c08-0d3fec1c8163', name: 'Interface',   sort_order: 60, color: '#2563EB' },
  { id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'Warehouse',   sort_order: 70, color: '#DC2626' },
  { id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'Delivery',    sort_order: 80, color: '#DC2626' },
  { id: 'bae6f8d6-adf0-46fa-80c6-fb8d4f1c55ad', name: 'After-Sales', sort_order: 90, color: '#16A34A' },
];

export const PREDEFINED_PHASES: Phase[] = [
  // Review
  { id: 'e08616b5-e122-4a6c-b5f9-2d60f1b6b979', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'Placed',            sort_order: 10 },
  { id: 'bee2b949-185e-426d-84f5-acee243a6c6c', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'WA Message Sent',   sort_order: 20 },
  { id: '99c137c4-c287-43b5-9604-2bb8362715b0', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'Call Made',         sort_order: 30 },
  { id: '587a3f63-3b24-4c9e-978b-42d2aa052f27', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'Quotation Sent',    sort_order: 40 },
  { id: 'a29ec299-2776-4b08-9d28-b8257540ece2', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'Deposit Paid',      sort_order: 50 },
  { id: 'bfbc78e2-2e6e-4456-962e-b2d9b195467f', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'Confirmed',         sort_order: 60 },
  { id: '6c60b1a2-8a20-4ea9-a656-b2d0b651cac7', phase_group_id: '4a552c4b-47ba-4f7c-b26c-c2241c53fbfd', name: 'To Be Cancelled',   sort_order: 80 },

  // Planning
  { id: '40862dae-7846-4b07-97c0-31bb9900366c', phase_group_id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'Check Inventory',   sort_order: 10 },
  { id: 'ddbd5ff5-4aa7-498f-89e5-365a2267b7fa', phase_group_id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'Modeling',          sort_order: 20 },
  { id: '32387d55-c46c-4ba6-aad1-bd7f1e229780', phase_group_id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'JO Preparation',    sort_order: 30 },
  { id: '32f907be-29ff-4640-82f9-3c435ecf7aca', phase_group_id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'Procurement',       sort_order: 40 },
  { id: '59942769-e9a6-432b-9b38-a8d85bc4df4e', phase_group_id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'Material Received', sort_order: 50 },
  { id: '9e53647b-4cb3-4788-abbc-17efa891a552', phase_group_id: 'fc63ae50-c40e-4259-8920-f2afcb6c6135', name: 'JO Released',       sort_order: 60 },

  // Production
  { id: '5e82262f-022a-4272-b019-4fc32dbfbc3e', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Cutting',              sort_order: 10 },
  { id: '6738b8ac-74e2-4109-b55a-1bd964e54515', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'CNC',                  sort_order: 20 },
  { id: '956d8767-b9a3-48bb-8905-9d0f72bc9f90', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Upholstery',           sort_order: 30 },
  { id: '6db4e53b-6733-483a-a1e4-d85d13065320', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Shaping & Joint Prep.', sort_order: 40 },
  { id: '9ccba542-6e7e-49bd-9352-423df8e0abf5', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Sand-Fillet',          sort_order: 50 },
  { id: 'ccdeded1-c9f2-4038-8d4f-a30390854371', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Workfront-Assembly',   sort_order: 60 },
  { id: '7e95c2a5-8cce-49e1-a812-cd6aa16e720a', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Assemble',             sort_order: 70 },
  { id: '5a955a24-3372-4777-96de-b4c40619566b', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Workfront-Paint',      sort_order: 80 },
  { id: 'bbade217-855f-4d87-b21c-0c168d55802e', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Paint',                sort_order: 90 },
  { id: 'abcc8289-3cd3-48f4-a697-f55c36beb308', phase_group_id: '8d4207c9-aa83-4262-954d-511d61a20998', name: 'Inspection',           sort_order: 100 },

  // Repair
  { id: '21f0f16c-8fde-448a-9b4d-340b47e4c33c', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'Received from WH',        sort_order: 10 },
  { id: 'ada647e7-4dea-47f5-9fa0-a1bc8d89a6e1', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'QC-Rejected',             sort_order: 20 },
  { id: '6e59e761-5c82-4a0d-866f-f52a73253b14', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Queue',                 sort_order: 30 },
  { id: '88b68624-ba46-4778-a744-933510871319', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Assessment',            sort_order: 40 },
  { id: '9cb04ae1-72d6-415e-a115-5a35b0bcdbad', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Cutting',               sort_order: 50 },
  { id: '20612fd8-f546-44e8-8d67-2100bf4cbb87', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-CNC',                   sort_order: 60 },
  { id: '5ba3d040-2bdb-4f43-93f8-799652a53b8a', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Upholstery',            sort_order: 70 },
  { id: '9c708f16-4f85-4310-837a-f497427a61bd', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Shaping & Joint Prep.', sort_order: 80 },
  { id: '3614fb79-745b-482e-9bac-fbb694e72067', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Sand-Fillet',          sort_order: 90 },
  { id: '809cc4a7-a134-4b33-92e1-eb9fe376c727', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Assemble & Label',      sort_order: 100 },
  { id: 'fa8baad2-25e0-4557-a09c-57e6ae63a0d4', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Paint',                 sort_order: 110 },
  { id: 'a5603bde-2411-4ec5-a561-b5c3f5c94ed8', phase_group_id: 'd13c3156-b12c-4e21-8fc0-ee4f9f85bc94', name: 'R-Inspection',            sort_order: 120 },

  // Dispatch
  { id: '7afda76b-f210-41f5-bd46-beefdc198803', phase_group_id: '0dbb5fde-04f8-4dc8-be03-db4799b84d9d', name: 'Packing List Check', sort_order: 10 },
  { id: '84e3ff64-89b5-4f76-83c6-e3a291a133a5', phase_group_id: '0dbb5fde-04f8-4dc8-be03-db4799b84d9d', name: 'Packaging',          sort_order: 20 },
  { id: '0044a2fe-d4ac-4234-9298-48339581b1d1', phase_group_id: '0dbb5fde-04f8-4dc8-be03-db4799b84d9d', name: 'Ready to Ship',      sort_order: 30 },

  // Interface
  { id: '8d580bef-68b4-41cd-aba0-bb3373e57e91', phase_group_id: '3d8878fc-e81c-42f8-8c08-0d3fec1c8163', name: 'Sent to WH',           sort_order: 10 },
  { id: 'ae75d7e0-f119-4fb2-8e8f-58ab821050dd', phase_group_id: '3d8878fc-e81c-42f8-8c08-0d3fec1c8163', name: 'Not Received in WH',   sort_order: 20 },
  { id: '023b3eb1-e903-41a3-9a3d-91918575e712', phase_group_id: '3d8878fc-e81c-42f8-8c08-0d3fec1c8163', name: 'Already in WH',        sort_order: 30 },
  { id: '45468778-e99c-44f5-9d99-c22bd4017ec0', phase_group_id: '3d8878fc-e81c-42f8-8c08-0d3fec1c8163', name: 'Not Available in WH',  sort_order: 40 },
  { id: '451a81c9-13eb-4f63-b52f-351ca646cc02', phase_group_id: '3d8878fc-e81c-42f8-8c08-0d3fec1c8163', name: 'Sent to Production',   sort_order: 50 },

  // Warehouse
  { id: '442b68c6-d430-46cd-b2eb-f705d24508b3', phase_group_id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'WH-Defected',    sort_order: 10 },
  { id: '7d05be3b-03e1-4295-aaa8-50756e1da6bd', phase_group_id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'WH-No_Response', sort_order: 20 },
  { id: 'bfc30045-5a5e-49cf-9230-5965412dcfc0', phase_group_id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'WH-Postponed',   sort_order: 30 },
  { id: '91ffa3ec-f436-4847-a4aa-b847de65d902', phase_group_id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'WH-Returned',    sort_order: 40 },
  { id: '5c48fb99-9c8b-48d2-a8f2-1a3573f8a249', phase_group_id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'WH-Stock',       sort_order: 50 },
  { id: '0fb71f68-3a65-4acb-b5f9-9de13ce5a178', phase_group_id: 'c86536e1-8acc-43a1-8135-896aafd20d29', name: 'WH-Ready',       sort_order: 60 },

  // Delivery
  { id: '1bd09bd5-59d9-4d1e-a0ee-f6c3d45274f4', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'DLV-Bareed-Cairo',    sort_order: 10 },
  { id: '6090d3a3-7771-49a2-9aa2-19bae17c62dd', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'DLV-Bareed-Tanta',    sort_order: 20 },
  { id: '32b67017-2ea4-4372-b95d-d09b344a3ce0', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'DLV-Bosta',           sort_order: 30 },
  { id: 'b34ae708-dbee-452e-abed-6cf0b09753fc', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'DLV-Private',         sort_order: 40 },
  { id: '647f9feb-5af5-4339-9e34-ea9c4dc3be17', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'Delivered Partially', sort_order: 50 },
  { id: 'fac15790-506d-4374-a9b0-82db1f50d68e', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'Delivered Fully',     sort_order: 60 },
  { id: '068e8741-d81b-4011-a8c6-61450dc38182', phase_group_id: '9f1d07e9-3ab7-41f5-857a-171fb0f8bbac', name: 'Maintenance',         sort_order: 70 },

  // After-Sales
  { id: '42b3997e-60cb-4900-9ae3-bbbba01d59ed', phase_group_id: 'bae6f8d6-adf0-46fa-80c6-fb8d4f1c55ad', name: 'Follow-up', sort_order: 10 },
  { id: 'e03b8006-83e4-49ff-9dae-b38ad7fe159a', phase_group_id: 'bae6f8d6-adf0-46fa-80c6-fb8d4f1c55ad', name: 'Offers',    sort_order: 20 },
];
