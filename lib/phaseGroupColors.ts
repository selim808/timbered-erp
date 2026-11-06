// One colour per Supabase phase group, shared by the Production WIP chart and the Daily flash.
export const NO_PHASE = 'No phase';

export const GROUP_COLORS: Record<string, string> = {
  'Confirmation': '#7f8c9d',
  'Planning':     '#8e44ad',
  'Production':   '#2980b9',
  'Warehouse':    '#f1948a',
  'Delivery':     '#27ae60',
  'After-sales':  '#f4d03f',
  [NO_PHASE]:     '#bdc3c7',
};

export const groupColor = (g: string) => GROUP_COLORS[g] ?? '#bdc3c7';
