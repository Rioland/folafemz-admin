/**
 * Declarative definitions for every editable section of the website.
 *
 * One config per table drives the list view, the form, validation and the
 * database write, so adding a section later means adding an entry here rather
 * than another four files. Vehicles keep their own bespoke screens — the rate
 * bands and image handling there earn the extra code.
 *
 * `column` names must match supabase/schema.sql exactly.
 */

export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'boolean'
  | 'lines' | 'select' | 'reference' | 'image' | 'video' | 'date';

export type Field = {
  column: string;
  label: string;
  type: FieldType;
  hint?: string;
  required?: boolean;
  /** select only */
  options?: string[];
  /** reference only: the table to draw options from, labelled by `refLabel`. */
  refTable?: string;
  refLabel?: string;
  /** Lay the field across the full width of the form grid. */
  wide?: boolean;
  /**
   * Value to store when the field is left empty.
   *
   * Some columns are NOT NULL with a database default. Writing null to one of
   * those fails outright, so an optional field backed by such a column has to
   * say what "empty" means. Without this, leaving Sort position blank made
   * every create fail with a not-null violation.
   */
  fallback?: string | number;
};

export type Resource = {
  /** URL segment: /content/<key> */
  key: string;
  table: string;
  label: string;
  /** Singular, for buttons like "Add city". */
  singular: string;
  /** Columns shown in the list, in order. */
  list: string[];
  /** Default sort. */
  orderBy: string;
  ascending?: boolean;
  fields: Field[];
  /**
   * Builds the public URL for a row, so staff can jump from the editor to the
   * live page. Returns null when the row has no page of its own.
   */
  publicPath?: (row: Record<string, unknown>) => string | null;
  /** Shown above the form when the section needs explaining. */
  note?: string;
};

const POSITION: Field = {
  column: 'position', label: 'Sort position', type: 'number',
  hint: 'Lower numbers come first. Leave empty for 0.',
  fallback: 0,
};

export const RESOURCES: Resource[] = [
  {
    key: 'categories',
    table: 'categories',
    label: 'Fleet categories',
    singular: 'category',
    list: ['name', 'slug', 'position'],
    orderBy: 'position',
    ascending: true,
    note: 'The groups the fleet filter uses. Renaming one updates every vehicle in it.',
    fields: [
      { column: 'name', label: 'Name', type: 'text', required: true },
      { column: 'slug', label: 'Web address', type: 'text', required: true },
      POSITION,
    ],
  },

  {
    key: 'cities',
    table: 'cities',
    label: 'Cities',
    singular: 'city',
    list: ['name', 'state', 'slug', 'position'],
    orderBy: 'position',
    ascending: true,
    publicPath: (r) => `/car-rental-${r.slug}/`,
    fields: [
      { column: 'name', label: 'Name', type: 'text', required: true },
      { column: 'slug', label: 'Web address', type: 'text', required: true },
      { column: 'state', label: 'State', type: 'text' },
      { column: 'tagline', label: 'Tagline', type: 'text', wide: true },
      { column: 'rating', label: 'Rating', type: 'text' },
      { column: 'areas_summary', label: 'Areas summary', type: 'textarea', wide: true },
      { column: 'intro', label: 'Introduction', type: 'richtext', wide: true },
      {
        column: 'highlights', label: 'Highlights', type: 'lines', wide: true,
        hint: 'One per line.',
      },
      { column: 'office_address', label: 'Office address', type: 'text', wide: true },
      { column: 'airport_branch', label: 'Airport branch', type: 'text', wide: true },
      { column: 'hero_image', label: 'Hero image', type: 'image', wide: true },
      { column: 'meta_title', label: 'Meta title', type: 'text', wide: true },
      { column: 'meta_description', label: 'Meta description', type: 'textarea', wide: true },
      POSITION,
    ],
  },

  {
    key: 'locations',
    table: 'locations',
    label: 'Areas',
    singular: 'area',
    list: ['name', 'city_id', 'slug', 'position'],
    orderBy: 'position',
    ascending: true,
    note:
      'Areas drive the location directory. Every area is combined with every ' +
      'directory service to generate a landing page, so adding one here adds ' +
      'a page for each service.',
    fields: [
      { column: 'name', label: 'Name', type: 'text', required: true },
      { column: 'slug', label: 'Web address', type: 'text', required: true },
      {
        column: 'city_id', label: 'City', type: 'reference',
        refTable: 'cities', refLabel: 'name', required: true,
      },
      { column: 'landmarks', label: 'Landmarks', type: 'textarea', wide: true },
      { column: 'blurb', label: 'Blurb', type: 'textarea', wide: true },
      POSITION,
    ],
  },

  {
    key: 'services',
    table: 'services',
    label: 'Services',
    singular: 'service',
    list: ['name', 'slug', 'has_landing_page', 'show_in_directory', 'position'],
    orderBy: 'position',
    ascending: true,
    publicPath: (r) => (r.has_landing_page ? `/services/${r.slug}/` : null),
    fields: [
      { column: 'name', label: 'Name', type: 'text', required: true },
      { column: 'slug', label: 'Web address', type: 'text', required: true },
      { column: 'link_label', label: 'Menu label', type: 'text' },
      {
        column: 'headline_template', label: 'Headline template', type: 'text', wide: true,
        hint: 'Tokens: {service}, {location}, {city}',
      },
      { column: 'summary', label: 'Summary', type: 'textarea', wide: true },
      { column: 'body', label: 'Body', type: 'richtext', wide: true },
      { column: 'image', label: 'Image', type: 'image', wide: true },
      {
        column: 'show_in_directory', label: 'Include in the location directory',
        type: 'boolean',
        hint: 'Generates a landing page for this service in every area.',
      },
      { column: 'has_landing_page', label: 'Has its own service page', type: 'boolean' },
      POSITION,
    ],
  },

  {
    key: 'posts',
    table: 'posts',
    label: 'Blog posts',
    singular: 'post',
    list: ['title', 'category', 'published_at', 'is_featured'],
    orderBy: 'published_at',
    ascending: false,
    publicPath: (r) => `/articles/${r.slug}/`,
    fields: [
      { column: 'title', label: 'Title', type: 'text', required: true, wide: true },
      { column: 'slug', label: 'Web address', type: 'text', required: true },
      { column: 'category', label: 'Category', type: 'text' },
      { column: 'author', label: 'Author', type: 'text' },
      {
        column: 'published_at', label: 'Published', type: 'date',
        hint: 'Leave empty to keep it unpublished.',
      },
      {
        column: 'read_minutes', label: 'Read time (minutes)', type: 'number',
        fallback: 4, hint: 'Leave empty for 4.',
      },
      { column: 'excerpt', label: 'Excerpt', type: 'textarea', wide: true },
      { column: 'body', label: 'Body', type: 'richtext', wide: true },
      { column: 'cover_image', label: 'Cover image', type: 'image', wide: true },
      { column: 'is_featured', label: 'Feature this post', type: 'boolean' },
    ],
  },

  {
    key: 'pages',
    table: 'pages',
    label: 'Pages',
    singular: 'page',
    list: ['title', 'slug', 'show_in_footer', 'position'],
    orderBy: 'position',
    ascending: true,
    publicPath: (r) => `/${r.slug}/`,
    fields: [
      { column: 'title', label: 'Title', type: 'text', required: true },
      { column: 'slug', label: 'Web address', type: 'text', required: true },
      { column: 'body', label: 'Body', type: 'richtext', wide: true },
      { column: 'show_in_footer', label: 'Link from the footer', type: 'boolean' },
      POSITION,
    ],
  },

  {
    key: 'faqs',
    table: 'faqs',
    label: 'FAQs',
    singular: 'FAQ',
    list: ['question', 'position'],
    orderBy: 'position',
    ascending: true,
    fields: [
      { column: 'question', label: 'Question', type: 'text', required: true, wide: true },
      { column: 'answer', label: 'Answer', type: 'textarea', required: true, wide: true },
      POSITION,
    ],
  },

  {
    key: 'testimonials',
    table: 'testimonials',
    label: 'Testimonials',
    singular: 'testimonial',
    list: ['name', 'rating', 'service', 'reviewed_on'],
    orderBy: 'position',
    ascending: true,
    fields: [
      { column: 'name', label: 'Name', type: 'text', required: true },
      { column: 'role', label: 'Role', type: 'text' },
      { column: 'quote', label: 'Quote', type: 'textarea', required: true, wide: true },
      {
        column: 'rating', label: 'Rating', type: 'select',
        options: ['1', '2', '3', '4', '5'], fallback: 5,
      },
      { column: 'service', label: 'Service', type: 'text' },
      { column: 'reviewed_on', label: 'Reviewed on', type: 'date' },
      POSITION,
    ],
  },

  {
    key: 'gallery',
    table: 'gallery',
    label: 'Gallery',
    singular: 'photograph',
    list: ['src', 'caption', 'position'],
    orderBy: 'position',
    ascending: true,
    fields: [
      { column: 'src', label: 'Image', type: 'image', required: true, wide: true },
      { column: 'caption', label: 'Caption', type: 'text', wide: true, fallback: '' },
      POSITION,
    ],
  },

  {
    key: 'videos',
    table: 'videos',
    label: 'Videos',
    singular: 'video',
    list: ['src', 'orientation', 'caption', 'position'],
    orderBy: 'position',
    ascending: true,
    fields: [
      {
        column: 'src', label: 'Video', type: 'video', required: true, wide: true,
        hint: 'Upload from this device, or paste a link such as /videos/fleet-walkaround.mp4',
      },
      {
        column: 'orientation', label: 'Orientation', type: 'select',
        options: ['landscape', 'portrait'], fallback: 'landscape',
      },
      { column: 'caption', label: 'Caption', type: 'text', wide: true, fallback: '' },
      POSITION,
    ],
  },

  {
    key: 'trip-rate-tables',
    table: 'trip_rate_tables',
    label: 'Trip rate tables',
    singular: 'trip rate table',
    list: ['base', 'destination', 'is_active'],
    orderBy: 'created_at',
    ascending: false,
    note:
      'Interstate work is priced per journey, not per day. Only one table may ' +
      'be active — the website shows the active one.',
    fields: [
      { column: 'base', label: 'From', type: 'text', required: true },
      { column: 'destination', label: 'To', type: 'text', required: true },
      { column: 'note', label: 'Note', type: 'textarea', wide: true, fallback: '' },
      { column: 'escort_label', label: 'Escort label', type: 'text', fallback: '' },
      { column: 'escort_rate', label: 'Escort rate (NGN)', type: 'number', fallback: 0 },
      { column: 'escort_unit', label: 'Escort unit', type: 'text', fallback: '' },
      { column: 'escort_note', label: 'Escort note', type: 'textarea', wide: true, fallback: '' },
      { column: 'is_active', label: 'This is the active table', type: 'boolean' },
    ],
  },

  {
    key: 'trip-rates',
    table: 'trip_rates',
    label: 'Trip rates',
    singular: 'trip rate',
    list: ['vehicle_label', 'one_way', 'return_trip', 'position'],
    orderBy: 'position',
    ascending: true,
    fields: [
      {
        column: 'table_id', label: 'Trip rate table', type: 'reference',
        refTable: 'trip_rate_tables', refLabel: 'destination', required: true,
      },
      { column: 'vehicle_label', label: 'Vehicle label', type: 'text', required: true },
      {
        column: 'vehicle_id', label: 'Fleet vehicle', type: 'reference',
        refTable: 'vehicles', refLabel: 'name',
        hint: 'Optional — links the row to a fleet card. Leave empty for a class such as "Small car".',
      },
      { column: 'one_way', label: 'One way (NGN)', type: 'number', required: true },
      { column: 'one_way_max', label: 'One way, top of band (NGN)', type: 'number' },
      { column: 'return_trip', label: 'Return (NGN)', type: 'number', required: true },
      { column: 'note', label: 'Note', type: 'text', wide: true },
      POSITION,
    ],
  },
];

export const getResource = (key: string) => RESOURCES.find((r) => r.key === key);

/**
 * A resource with `publicPath` removed, safe to hand to a client component.
 *
 * `publicPath` is a function, and functions cannot cross the server/client
 * boundary — React refuses to serialise them. Passing a whole Resource into
 * the form crashed the page with "Functions cannot be passed directly to
 * Client Components". Taking this type instead makes that a compile error
 * rather than a runtime one.
 */
export type FormResource = Omit<Resource, 'publicPath'>;

export function toFormResource(resource: Resource): FormResource {
  const { publicPath: _publicPath, ...rest } = resource;
  return rest;
}

/** Human-readable column heading for the list view. */
export function columnLabel(resource: Resource, column: string): string {
  return resource.fields.find((f) => f.column === column)?.label ?? column;
}
