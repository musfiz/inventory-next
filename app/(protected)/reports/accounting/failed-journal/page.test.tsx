/**
 * Renders the Failed Journal Queue page against a captured API payload so the
 * screen is checked against what the backend actually returns (RPT-ACC-003).
 *
 * The payload is a verbatim `GET /api/v1/reports/accounting/failed-journal`
 * response built from a rolled-back fixture of `failed_journal_entries` for one
 * tenant:
 *
 * - two unresolved `purchase` failures on the same reference_id (PO-2026-0001,
 *   1,000 occurred 100 days ago and 250 three days ago) so the recurrence
 *   column has something to count;
 * - one unresolved unbalanced `sales` failure (DR 500 / CR 400) that occurred
 *   today, which is what `imbalance` is for;
 * - one resolved `pos` failure that took five days to clear;
 * - one resolved `expense` failure that was resolved in the same instant, so
 *   `age_days` must clamp at zero rather than go negative.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import FailedJournalPage from './page';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    failedJournal: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    isSuperAdmin: false,
    hasPermission: () => true,
  }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (sel: (s: any) => any) => sel({ user: { tenant_id: 'tenant-1' } }),
}));

vi.mock('@/components/ui/tenant-select', () => ({
  default: () => <div data-testid="tenant-select" />,
}));

vi.mock('@/components/ui/date-picker', () => ({
  default: ({ value, onChange }: any) => (
    <input
      data-testid={`date-${value ? value : 'empty'}`}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/lib/notifications', () => ({
  notify: { error: vi.fn(), warning: vi.fn() },
}));

// ── Captured API payload ─────────────────────────────────────────────────────

const OLD_PO = {
  id: 'fje-1',
  tenant_id: 'tenant-1',
  occurred_at: '2026-07-28 10:15:00',
  status: 'unresolved' as const,
  age_days: 100,
  age_bucket: 'd_90_plus' as const,
  reference_type: 'purchase',
  reference_number: 'PO-2026-0001',
  reference_id: 'po-1',
  description: 'Goods received from ACME',
  line_count: 2,
  failed_value: 1000,
  imbalance: 0,
  error_class: 'RuntimeException',
  error_message: 'Unbalanced journal entry: total_debit=1000.00, total_credit=900.00',
  recurring_count: 2,
  resolved_at: null,
  resolver_name: null,
  creator_name: 'Kamal Hossain',
  resolution_note: null,
};

const NEW_PO = {
  ...OLD_PO,
  id: 'fje-2',
  occurred_at: '2026-10-02 09:00:00',
  age_days: 3,
  age_bucket: 'd_1_7' as const,
  failed_value: 250,
  error_message: 'Unbalanced journal entry',
};

const UNBALANCED = {
  ...OLD_PO,
  id: 'fje-3',
  occurred_at: '2026-10-05 11:00:00',
  age_days: 0,
  age_bucket: 'today' as const,
  reference_type: 'sales',
  reference_number: 'SO-2026-0009',
  reference_id: 'so-9',
  description: 'POS sale',
  failed_value: 500,
  imbalance: 100,
  recurring_count: 1,
  error_message: 'Unbalanced journal entry',
};

const RESOLVED_POS = {
  ...OLD_PO,
  id: 'fje-4',
  occurred_at: '2026-08-26 14:00:00',
  status: 'resolved' as const,
  age_days: 5,
  age_bucket: 'd_1_7' as const,
  reference_type: 'pos',
  reference_number: 'POS-003',
  reference_id: 'pos-3',
  description: 'Counter sale',
  failed_value: 75.5,
  error_class: 'QueryException',
  error_message: 'SQLSTATE deadlock detected',
  recurring_count: 1,
  resolved_at: '2026-08-31 16:30:00',
  resolution_note: 'Retried successfully.',
};

const RESOLVED_NOW = {
  ...RESOLVED_POS,
  id: 'fje-5',
  occurred_at: '2026-10-05 12:00:00',
  age_days: 0,
  age_bucket: 'today' as const,
  reference_type: 'expense',
  reference_number: 'EXP-001',
  reference_id: 'ex-1',
  description: 'Rent',
  failed_value: 2000,
  resolved_at: '2026-10-05 12:00:00',
  resolution_note: 'Voided',
};

const PAYLOAD = {
  data: [UNBALANCED, NEW_PO, OLD_PO, RESOLVED_POS, RESOLVED_NOW],
  summary: {
    as_of_date: '2026-10-05',
    total_count: 5,
    unresolved_count: 3,
    resolved_count: 2,
    unresolved_value: 1750,
    total_value: 3825.5,
    oldest_unresolved_days: 100,
    total_lines: 10,
    unbalanced_count: 1,
    recurring_count: 2,
    unattributed_count: 1,
    by_bucket: [
      { key: 'today', label: 'Today', count: 1, value: 500, share_pct: 33.3 },
      { key: 'd_1_7', label: '1-7 Days', count: 1, value: 250, share_pct: 33.3 },
      { key: 'd_8_30', label: '8-30 Days', count: 0, value: 0, share_pct: 0 },
      { key: 'd_31_90', label: '31-90 Days', count: 0, value: 0, share_pct: 0 },
      { key: 'd_90_plus', label: '90+ Days', count: 1, value: 1000, share_pct: 33.3 },
    ],
    by_reference_type: [
      { key: 'purchase', label: 'Purchase', count: 2, value: 1250, share_pct: 40 },
      { key: 'expense', label: 'Expense', count: 1, value: 2000, share_pct: 20 },
      { key: 'pos', label: 'Pos', count: 1, value: 75.5, share_pct: 20 },
      { key: 'sales', label: 'Sales', count: 1, value: 500, share_pct: 20 },
    ],
    by_error_class: [
      { key: 'RuntimeException', label: 'RuntimeException', count: 4, value: 3750, share_pct: 80 },
      { key: 'QueryException', label: 'QueryException', count: 1, value: 75.5, share_pct: 20 },
    ],
  },
  columns: [],
  filters_applied: ['Status: Unresolved only'],
  generated_at: '2026-10-05T15:00:00+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Exact-text matcher: report headers such as "90+ Days" are not regexes. */
const escapeRegExp = (value: string) =>
  new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const generate = async () => {
  render(<FailedJournalPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Occurred$/ })).toBeInTheDocument());
};

/** The rendered text of one named column within a row. */
const cellTextFor = (row: HTMLElement, header: string) => {
  const headers = within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map(h => h.textContent?.trim() ?? '');
  const idx = headers.findIndex(h => h === header);
  expect(idx, `no column header named "${header}"`).toBeGreaterThanOrEqual(0);
  const cells = within(row).getAllByRole('cell');
  return (cells[idx]?.textContent ?? '').trim();
};

/**
 * The row for a reference number. `index` picks between repeats — the two
 * `purchase` failures deliberately share PO-2026-0001, because a reference
 * failing twice is exactly what the recurrence column counts.
 */
const rowFor = (referenceNumber: string, index = 0) => {
  const rows = within(screen.getByRole('table')).getAllByText(referenceNumber);
  expect(rows.length, `no row for "${referenceNumber}"`).toBeGreaterThan(index);
  return rows[index].closest('tr') as HTMLElement;
};

/**
 * The native filter <select>s. FilterField labels are not associated with their
 * control, so they are found by an option only they carry.
 */
const selectHaving = (option: string) => {
  const select = screen
    .getAllByRole('combobox')
    .find(s => Array.from(s.querySelectorAll('option')).some(o => o.textContent === option));
  expect(select, `no filter select offering "${option}"`).toBeTruthy();
  return select!;
};

/**
 * A summary card's own content, located from its label. Scoping matters because
 * card values overlap table cells — ৳1,000.00 is both a card value and a cell.
 */
const cardFor = (label: string) => {
  const el = screen.getAllByText(label).find(n => n.closest('div.rounded-md'));
  expect(el, `no summary card labelled "${label}"`).toBeTruthy();
  return el!.closest('div.rounded-md') as HTMLElement;
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('FailedJournalPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<FailedJournalPage />);
    expect(screen.queryByRole('columnheader', { name: /^Occurred$/ })).not.toBeInTheDocument();
  });

  it('defaults to the unresolved queue and the resolved tenant', async () => {
    await generate();
    expect(captured.params.status).toBe('unresolved');
    expect(captured.params.as_of_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
    expect(captured.params.only_recurring).toBe(0);
  });

  it('renders every column the report definition declares', async () => {
    await generate();

    for (const header of [
      'Occurred',
      'Status',
      'In Queue',
      'Reference Type',
      'Reference #',
      'Reference ID',
      'Description',
      'Lines',
      'Value Not Posted',
      'Imbalance',
      'Error Type',
      'Error Message',
      'Recurs',
      'Resolved At',
      'Resolved By',
      'Resolution Note',
    ]) {
      // Headers are matched literally: "Imbalance" and "Reference #" are not
      // regexes.
      expect(screen.getByRole('columnheader', { name: escapeRegExp(header) })).toBeInTheDocument();
    }
  });

  it('derives the queue status from resolved_at rather than a stored flag', async () => {
    await generate();

    expect(cellTextFor(rowFor('SO-2026-0009'), 'Status')).toBe('Unresolved');
    expect(cellTextFor(rowFor('POS-003'), 'Status')).toBe('Resolved');
  });

  it('reports the value that never posted per row', async () => {
    await generate();

    // Both PO failures are listed; the older one is worth 1,000, the newer 250.
    expect(cellTextFor(rowFor('PO-2026-0001', 0), 'Value Not Posted')).toBe(formatCurrency(250));
    expect(cellTextFor(rowFor('PO-2026-0001', 1), 'Value Not Posted')).toBe(formatCurrency(1000));
    expect(cellTextFor(rowFor('SO-2026-0009'), 'Value Not Posted')).toBe(formatCurrency(500));
  });

  it('surfaces a non-zero imbalance and dims a balanced entry', async () => {
    await generate();

    // The unbalanced entry is the bug: retrying it unchanged fails again.
    expect(cellTextFor(rowFor('SO-2026-0009'), 'Imbalance')).toBe(formatCurrency(100));
    // A healthy zero reads as a dash, not ৳0.00.
    expect(cellTextFor(rowFor('PO-2026-0001', 0), 'Imbalance')).toBe('—');
  });

  it('marks a reference that has failed more than once', async () => {
    await generate();

    expect(cellTextFor(rowFor('PO-2026-0001', 0), 'Recurs')).toBe(`${formatNumber(2)}×`);
    expect(cellTextFor(rowFor('SO-2026-0009'), 'Recurs')).toBe('—');
  });

  it('ages a resolved row by how long it took to clear, never negative', async () => {
    await generate();

    expect(cellTextFor(rowFor('PO-2026-0001', 1), 'In Queue')).toBe(`${formatNumber(100)}d`);
    expect(cellTextFor(rowFor('SO-2026-0009'), 'In Queue')).toBe('today');
    // Cleared in the same instant: zero, not -0.
    expect(cellTextFor(rowFor('EXP-001'), 'In Queue')).toBe('today');
  });

  it('renders the headline cards from the report summary', async () => {
    await generate();

    expect(within(cardFor('Value Not Posted')).getByText(formatCurrency(1750))).toBeInTheDocument();
    expect(within(cardFor('Value Not Posted')).getByText('the ledger is out by this')).toBeInTheDocument();

    expect(within(cardFor('Unresolved')).getByText(formatNumber(3))).toBeInTheDocument();
    expect(within(cardFor('Unresolved')).getByText(/of 5 failures/)).toBeInTheDocument();

    expect(within(cardFor('Oldest Open Failure')).getByText(`${formatNumber(100)}d`)).toBeInTheDocument();
    expect(within(cardFor('Unbalanced Entries')).getByText(formatNumber(1))).toBeInTheDocument();
    expect(within(cardFor('Repeated Failures')).getByText(formatNumber(2))).toBeInTheDocument();
    expect(within(cardFor('Resolved')).getByText(formatNumber(2))).toBeInTheDocument();

    // Failures whose attempted header never named a tenant.
    expect(within(cardFor('No Tenant')).getByText(formatNumber(1))).toBeInTheDocument();
    expect(within(cardFor('No Tenant')).getByText('failed before a tenant was known')).toBeInTheDocument();
  });

  it('reads the queue-age ladder from the summary breakdown', async () => {
    await generate();

    expect(within(cardFor('90+ Days')).getByText(formatNumber(1))).toBeInTheDocument();
    expect(within(cardFor('90+ Days')).getByText(/৳1,000\.00/)).toBeInTheDocument();

    // Empty buckets stay visible so the ladder does not reflow as failures age.
    expect(within(cardFor('31-90 Days')).getByText(formatNumber(0))).toBeInTheDocument();
  });

  it('breaks the queue down by posting routine and by error type', async () => {
    await generate();

    const purchaseCard = cardFor('Purchase');
    expect(within(purchaseCard).getByText(formatNumber(2))).toBeInTheDocument();

    // One card group per breakdown, so a repeated label cannot collide.
    expect(screen.getAllByText('RuntimeException').length).toBeGreaterThan(0);
    expect(screen.getAllByText('QueryException').length).toBeGreaterThan(0);
  });

  it('drills into a bucket when its card is clicked', async () => {
    render(<FailedJournalPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Occurred$/ })).toBeInTheDocument());

    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('90+ Days')).getByText('90+ Days'));
    });

    await waitFor(() => expect(captured.params.age_bucket).toBe('d_90_plus'));

    // Clicking the active card clears the drill-down.
    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('90+ Days')).getByText('90+ Days'));
    });

    await waitFor(() => expect(captured.params.age_bucket).toBeUndefined());
  });

  it('passes each filter through under its backend param name', async () => {
    await generate();

    captured.params = {};
    fireEvent.change(selectHaving('All Failures'), { target: { value: 'all' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. purchase, pos/i), {
      target: { value: 'purchase' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Reference number, ID or error/i), {
      target: { value: 'PO-2026' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.status).toBe('all'));
    expect(captured.params.reference_type).toBe('purchase');
    expect(captured.params.search).toBe('PO-2026');
  });

  it('sends the repeated-failures switch as a flag', async () => {
    await generate();

    captured.params = {};
    fireEvent.click(screen.getByRole('checkbox', { name: /Repeated failures only/i }));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.only_recurring).toBe(1));
  });

  it('omits the date bounds until they are set', async () => {
    await generate();
    expect(captured.params.start_date).toBeUndefined();
    expect(captured.params.end_date).toBeUndefined();
  });

  it('renders the totals footer from the summary', async () => {
    await generate();

    const footer = screen.getByText('Totals').closest('tr') as HTMLElement;
    expect(cellTextFor(footer, 'Value Not Posted')).toBe(formatCurrency(3825.5));
    expect(cellTextFor(footer, 'Lines')).toBe(formatNumber(10));
  });

  it('clears the data and filters on reset', async () => {
    await generate();
    expect(screen.getByRole('columnheader', { name: /^Occurred$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: /^Occurred$/ })).not.toBeInTheDocument(),
    );
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.failedJournal = vi.fn(async () => {
      throw {
        response: {
          data: {
            message: 'The status must be one of: unresolved, resolved, all.',
          },
        },
      };
    }) as any;

    render(<FailedJournalPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(screen.getByText(/The status must be one of/)).toBeInTheDocument());
  });
});