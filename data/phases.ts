import type { PhaseGroup, Phase } from '@/components/shared/PipelineOrderCard';

// ─── Predefined phase snapshot ───────────────────────────────────────────────
// Phases & phase-groups change rarely. The app renders from this predefined
// snapshot (and a localStorage copy the owner refreshes via the "Load new
// phases" button on the dashboard) instead of hitting the DB on every page.
// Regenerate by tapping "Load new phases" — that overwrites the cached copy;
// this file is the offline / first-load fallback.
// Last snapshot: 2026-10-29.

export const PREDEFINED_PHASE_GROUPS: PhaseGroup[] = [
  { id: 'f2a7d232-2075-4b6a-915d-a921612f9c6e', name: "Confirmation", sort_order: 10, color: '#16A34A' },
  { id: '6974ff21-046e-44b5-82a7-e41076223d74', name: "Planning", sort_order: 20, color: '#16A34A' },
  { id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Production", sort_order: 30, color: '#2563EB' },
  { id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Warehouse", sort_order: 40, color: '#DC2626' },
  { id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "Delivery", sort_order: 50, color: '#DC2626' },
  { id: 'bf8682d2-c37e-4de2-8b7b-6180b7a2c78e', name: "After-sales", sort_order: 60, color: '#16A34A' },
];

export const PREDEFINED_PHASES: Phase[] = [
  // Confirmation
  { id: '9aadccd9-5fb3-498a-99ff-d762f81cecb0', phase_group_id: 'f2a7d232-2075-4b6a-915d-a921612f9c6e', name: "WA Confirmation", sort_order: 10 },
  { id: 'fd04538d-7658-4f27-bff2-6198ecc3ce86', phase_group_id: 'f2a7d232-2075-4b6a-915d-a921612f9c6e', name: "Call Confirmation", sort_order: 20 },
  { id: '1f48ea59-b0fe-482e-8eb9-f2c7572e41b9', phase_group_id: 'f2a7d232-2075-4b6a-915d-a921612f9c6e', name: "Deposit", sort_order: 30 },

  // Planning
  { id: 'aa15c015-a142-49fa-bd8c-fbf010038bd1', phase_group_id: '6974ff21-046e-44b5-82a7-e41076223d74', name: "Check Inventory", sort_order: 10 },
  { id: '31fec0d5-fc24-44da-b295-ff395dfe241b', phase_group_id: '6974ff21-046e-44b5-82a7-e41076223d74', name: "Modeling", sort_order: 20 },
  { id: 'c42cf288-4ddb-4701-9c56-fb463a2e3d43', phase_group_id: '6974ff21-046e-44b5-82a7-e41076223d74', name: "JO Preparation", sort_order: 30 },
  { id: 'e99d165e-70c4-4ef8-9bae-9d69b219053f', phase_group_id: '6974ff21-046e-44b5-82a7-e41076223d74', name: "Procurement", sort_order: 40 },

  // Production
  { id: 'b9d041b5-8813-43b2-baf2-0ac1157f4c0e', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Cutting", sort_order: 10 },
  { id: '17e893b2-a63c-465d-b29d-64becf806b3d', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "CNC", sort_order: 20 },
  { id: 'e8f9104d-c3a5-436b-a094-a14fdc68bf04', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Upholstery", sort_order: 30 },
  { id: '36cdb7fe-c518-41ee-b14d-1ec534b896cf', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Shaping & Joint Prep.", sort_order: 40 },
  { id: '19ad8d80-b434-4466-bfed-07a288acb853', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Sand-Fillet", sort_order: 50 },
  { id: '8534f4a3-6349-4124-8414-7857ce8d0f8a', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Assemble", sort_order: 60 },
  { id: '8d255f02-ecfc-486b-9662-7c343402c102', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Paint", sort_order: 70 },
  { id: 'f9e560f2-df7e-452e-b388-582015f61991', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Inspection", sort_order: 80 },
  { id: 'ddd8babd-0271-4471-9a50-126949ce803e', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Re-work", sort_order: 90 },
  { id: 'a7ad7deb-90fb-4cf9-8990-dc9863e2a253', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Packaging", sort_order: 100 },
  { id: 'd3708362-73ac-42a1-be24-c1fac5fbb0c2', phase_group_id: '170ee236-b02d-49ee-929a-fdd3e8df4f92', name: "Shipping to WH", sort_order: 110 },

  // Warehouse
  { id: 'ad047f70-e06b-4954-ae34-6bcc380131f8', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Shipping Received & Approved", sort_order: 10 },
  { id: '13128e99-3e3e-4220-808f-d2a18103626b', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Not in WH", sort_order: 20 },
  { id: '88142289-2a1a-491a-add9-51b3d4bf4c14', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Missing Parts", sort_order: 30 },
  { id: '4cc69809-2d6a-4d01-83fd-599f49acc2e5', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Defected", sort_order: 40 },
  { id: '1e821f8f-9037-4de8-8943-d0718d938d12', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Sending to Production", sort_order: 50 },
  { id: 'd6bd82c7-b7f6-493a-8477-ac12f667b856', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Ready", sort_order: 60 },
  { id: 'e81e8013-9681-4136-965a-06c974c6e336', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "No Response from Customer", sort_order: 70 },
  { id: 'aad75750-6716-4c14-9ecd-62c6f0d27593', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Postponed (no date)", sort_order: 80 },
  { id: '39d5f5e5-8773-4144-a36e-c920ef023c94', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Difficult Delivery", sort_order: 90 },
  { id: 'bc128239-3eb5-4b0b-b91c-5b5193a0fb34', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Refuse Partial", sort_order: 100 },
  { id: 'e65912b2-3f24-4a15-90a9-4b083a44dae1', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Scheduled (dated)", sort_order: 110 },
  { id: '26e73f6a-d1f6-40fb-9834-34f2e0ff562d', phase_group_id: 'a8876fb7-e608-4a75-8ae6-3c7a243b7771', name: "Returned", sort_order: 120 },

  // Delivery
  { id: '4d4244f6-1191-422c-9440-b126c4c39294', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "With Bareed-Cairo", sort_order: 10 },
  { id: '45b37285-dacc-4c5f-ac5e-22fad47f3971', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "With Bareed-Tanta", sort_order: 20 },
  { id: 'a285086d-4b03-41f6-9a09-23ce411aad97', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "With Bosta", sort_order: 30 },
  { id: 'c5942a5d-7130-4a96-a4a2-3222252ce9de', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "With Private", sort_order: 40 },
  { id: '039ee7fc-f593-4d77-8c5f-54c2a6a2f2cc', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "Delivery Failed", sort_order: 50 },
  { id: '5e70e576-5458-4bf2-aa8f-753c3bc8495f', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "Returned to WH", sort_order: 60 },
  { id: '050ca8d5-1ece-47a2-b583-d71c02e01a5b', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "Partially Delivered", sort_order: 70 },
  { id: 'ab31319d-cbca-4d5d-a541-17cbf378dccf', phase_group_id: '81dc779b-aa59-482e-9600-bcdb403c9f62', name: "Fully Delivered", sort_order: 80 },

  // After-sales
  { id: '5baf9f77-3b98-4081-b1e1-247009f88fb8', phase_group_id: 'bf8682d2-c37e-4de2-8b7b-6180b7a2c78e', name: "Return Requested", sort_order: 10 },
  { id: 'b1024b7f-610d-48e3-8541-79a12344b481', phase_group_id: 'bf8682d2-c37e-4de2-8b7b-6180b7a2c78e', name: "Maintenance Requested", sort_order: 20 },
  { id: '652bc42c-c3b2-40b7-90e9-b93194267099', phase_group_id: 'bf8682d2-c37e-4de2-8b7b-6180b7a2c78e', name: "Replacement Requested", sort_order: 30 },
  { id: '89d97900-27a1-462c-b472-b9349422d861', phase_group_id: 'bf8682d2-c37e-4de2-8b7b-6180b7a2c78e', name: "Closed", sort_order: 40 },
];
