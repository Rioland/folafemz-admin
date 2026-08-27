'use client';

import { setStatus } from '@/app/(dashboard)/enquiries/actions';
import { ENQUIRY_STATUSES, type EnquiryStatus } from '@/lib/types';

/** Changing the selection submits immediately — no separate save button. */
export function StatusSelect({ id, status }: { id: string; status: EnquiryStatus }) {
  return (
    <form action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Enquiry status"
      >
        {ENQUIRY_STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <noscript><button type="submit" className="btn btn--ghost">Set</button></noscript>
    </form>
  );
}
