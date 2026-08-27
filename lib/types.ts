/**
 * Database row shapes.
 *
 * Column names are snake_case as Postgres returns them. The export endpoint is
 * the single place that maps these onto the camelCase shapes the public site's
 * lib/content.ts expects, so nothing else has to think about the difference.
 */

export type Category = {
  id: string; name: string; slug: string; position: number;
};

export type Vehicle = {
  id: string;
  name: string;
  slug: string;
  category_id: string | null;
  daily_rate: number | null;
  daily_rate_max: number | null;
  daily_label: string | null;
  secondary_rate: number | null;
  secondary_label: string | null;
  rate_note: string | null;
  seats: string | null;
  description: string | null;
  image: string | null;
  is_featured: boolean;
  position: number;
  created_at?: string;
  updated_at?: string;
};

/** A vehicle joined to its category, as the list and export queries return it. */
export type VehicleWithCategory = Vehicle & {
  categories: Pick<Category, 'name' | 'slug'> | null;
};

export type Enquiry = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vehicle: string | null;
  service: string | null;
  pickup_date: string | null;
  pickup_location: string | null;
  destination: string | null;
  days: string | null;
  notes: string | null;
  source: string | null;
  status: EnquiryStatus;
  created_at: string;
};

export const ENQUIRY_STATUSES = ['new', 'contacted', 'booked', 'closed'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export type SettingRow = { key: string; value: unknown };

/** Blank vehicle for the "new vehicle" form. */
export const emptyVehicle: Omit<Vehicle, 'id'> = {
  name: '', slug: '', category_id: null,
  daily_rate: null, daily_rate_max: null, daily_label: null,
  secondary_rate: null, secondary_label: null, rate_note: null,
  seats: null, description: null, image: null,
  is_featured: false, position: 0,
};

/** "Toyota Prado 2022" → "toyota-prado-2022" */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const naira = (amount: number | null) =>
  amount === null ? '—' : `NGN${amount.toLocaleString('en-NG')}`;
