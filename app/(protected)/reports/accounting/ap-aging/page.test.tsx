/**
 * Renders the AP Aging page against a captured API payload so the screen is
 * checked against what the backend actually returns (RPT-ACC-002).
 *
 * The payload is a verbatim `GET /api/v1/reports/accounting/ap-aging` response
 * captured against the local database with a rolled-back fixture of posted AP
 * entries for one tenant:
 *
 * - 1,500 CR AP against PO-2026-0001 (1,000, due 100 days ago) and
 *   PO-2026-0002 (500, due today) for Kamal Hossain, so his 1,500 ages as 1,000
 *   in 90+ and 500 current;
 * - 700 CR AP for Rahim Traders with no open order behind it, which the backend
 *   reports as `unallocated_value` rather than dropping into the oldest bucket;
 * - 250 CR AP on a `manual` journal, which resolves to no supplier at all and is
 *   reported as `unattributed_value`.
 *
 * 1,500 + 700 = 2,200 attributable, + 250 unattributed = the 2,450 control
 * account balance, which is what makes the ledger cards worth showing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import APAgingPage from './page';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    apAging: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/services/supplierService', () => ({
  default: {
    getSuppliers: vi.fn(async () => ({
      data: { data: [{ id: 'sup-1', name: 'Kamal Hossain' }, { id: 'sup-2', name: 'Rahim Traders' }] },
    })),
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
  default: ({ value }: any) => <input data-testid="date-picker" value={value ?? ''} readOnly />,
}));

vi.mock('@/components/ui/custom-select', () => ({
  default: ({ loadOptions, placeholder, onChange }: any) => (
    <button
      data-testid={`select-${placeholder ?? 'x'}`}
      onClick={async () => {
        const opts = await loadOptions('');
        onChange(opts[0] ?? null);
      }}
    >
      {placeholder ?? 'select'}
    </button>
  ),
}));

vi.mock('@/lib/notifications', () => ({
  notify: { error: vi.fn(), warning: vi.fn() },
}));

// ── Captured API payload ─────────────────────────────────────────────────────

const KAMAL = {
  supplier_id: '66b980e1-56bd-423c-90f7-0593dfaacbc0',
  supplier_name: 'Kamal Hossain',
  code: 'SP1005',
  phone: '+8801812345679',
  email: null,
  supplier_status: 'active',
  payment_terms: null,
  total_outstanding: 1500,
  current: 500,
  d_1_30: 0,
  d_31_60: 0,
  d_61_90: 0,
  d_90_plus: 1000,
  total_overdue: 1000,
  overdue_pct: 66.7,
  oldest_days_overdue: 100,
  po_count: 2,
  po_numbers: 'PO-2026-0001, PO-2026-0002',
  unallocated_value: 0,
  credit_limit: 0,
  available_credit: null,
  credit_status: 'no_limit',
};

const RAHIM = {
  supplier_id: 'bbe92ca3-a6dd-4896-8a97-393f7c657796',
  supplier_name: 'Rahim Traders',
  code: 'SP1010',
  phone: '+8801911223344',
  email: null,
  supplier_status: 'active',
  payment_terms: null,
  total_outstanding: 700,
  current: 0,
  d_1_30: 0,
  d_31_60: 0,
  d_61_90: 0,
  d_90_plus: 0,
  total_overdue: 0,
  overdue_pct: 0,
  oldest_days_overdue: 0,
  po_count: 0,
  po_numbers: '',
  unallocated_value: 700,
  credit_limit: 0,
  available_credit: null,
  credit_status: 'no_limit',
};

const PAYLOAD = {
  data: [KAMAL, RAHIM],
  summary: {
    as_of_date: '2026-10-05',
    supplier_count: 2,
    po_count: 2,
    total_outstanding: 2200,
    total_current: 500,
    total_overdue: 1000,
    overdue_pct: 45.5,
    overdue_supplier_count: 1,
    over_limit_supplier_count: 0,
    oldest_days_overdue: 100,
    unallocated_value: 700,
    control_account_balance: 2450,
    unattributed_value: 250,
    control_accounts: '2101 Accounts Payable',
    by_bucket: [
      { key: 'current', label: 'Current', amount: 500, suppliers: 1, share_pct: 22.7 },
      { key: 'd_1_30', label: '1-30 Days', amount: 0, suppliers: 0, share_pct: 0 },
      { key: 'd_31_60', label: '31-60 Days', amount: 0, suppliers: 0, share_pct: 0 },
      { key: 'd_61_90', label: '61-90 Days', amount: 0, suppliers: 0, share_pct: 0 },
      { key: 'd_90_plus', label: '90+ Days', amount: 1000, suppliers: 1, share_pct: 45.5 },
    ],
  },
  columns: [],
  filters_applied: ['As of 05 Oct 2026'],
  generated_at: '2026-10-05T15:00:00+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Exact-text matcher: report headers such as "90+ Days" are not regexes. */
const escapeRegExp = (value: string) =>
  new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const generate = async () => {
  render(<APAgingPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Supplier$/ })).toBeInTheDocument());
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

const rowFor = (name: string) => within(screen.getByRole('table')).getByText(name).closest('tr') as HTMLElement;

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
 * card values overlap table cells — ৳500.00 is both a card value and a cell.
 */
const cardFor = (label: string) => {
  const el = screen.getAllByText(label).find(n => n.closest('div.rounded-md'));
  expect(el, `no summary card labelled "${label}"`).toBeTruthy();
  return el!.closest('div.rounded-md') as HTMLElement;
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('APAgingPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<APAgingPage />);
    expect(screen.queryByRole('columnheader', { name: /^Supplier$/ })).not.toBeInTheDocument();
  });

  it('sends the as-of date and the resolved tenant by default', async () => {
    await generate();
    expect(captured.params.as_of_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
    expect(captured.params.only_overdue).toBe(0);
  });

  it('renders every column the report definition declares', async () => {
    await generate();

    for (const header of [
      'Supplier',
      'Code',
      'Phone',
      'Total Payable',
      'Current',
      '1-30 Days',
      '31-60 Days',
      '61-90 Days',
      '90+ Days',
      'Total Overdue',
      'Overdue %',
      'Oldest Days',
      'POs',
      'Unallocated',
      'Credit Limit',
      'Available Credit',
      'Credit',
    ]) {
      // Headers are matched literally: "90+ Days" and "Overdue %" are not
      // regexes.
      expect(screen.getByRole('columnheader', { name: escapeRegExp(header) })).toBeInTheDocument();
    }
  });

  it('pivots each supplier ledger balance across the aging buckets', async () => {
    await generate();

    const kamal = rowFor('Kamal Hossain');
    expect(cellTextFor(kamal, 'Total Payable')).toBe(formatCurrency(1500));
    expect(cellTextFor(kamal, 'Current')).toBe(formatCurrency(500));
    expect(cellTextFor(kamal, '90+ Days')).toBe(formatCurrency(1000));
    expect(cellTextFor(kamal, 'Total Overdue')).toBe(formatCurrency(1000));
    expect(cellTextFor(kamal, 'Overdue %')).toBe('66.7%');
    expect(cellTextFor(kamal, 'Oldest Days')).toBe(formatNumber(100));
    expect(cellTextFor(kamal, 'POs')).toBe(formatNumber(2));

    // The buckets plus the unallocated residual always add back to the ledger.
    const rahim = rowFor('Rahim Traders');
    expect(cellTextFor(rahim, 'Total Payable')).toBe(formatCurrency(700));
    expect(cellTextFor(rahim, 'Current')).toBe(formatCurrency(0));
    expect(cellTextFor(rahim, 'Total Overdue')).toBe(formatCurrency(0));
    expect(cellTextFor(rahim, 'POs')).toBe(formatNumber(0));
  });

  it('shows ledger money with no order behind it as unallocated, not as 90+', async () => {
    await generate();

    // Ageing uninvoiced money by assumption is how an aging report starts
    // lying, so 700 sits in its own column and in no bucket at all.
    const rahim = rowFor('Rahim Traders');
    expect(cellTextFor(rahim, 'Unallocated')).toBe(formatCurrency(700));
    expect(cellTextFor(rahim, '90+ Days')).toBe(formatCurrency(0));
  });

  it('renders the ledger and payment cards from the report summary', async () => {
    await generate();

    expect(within(cardFor('Total Payable')).getByText(formatCurrency(2200))).toBeInTheDocument();
    expect(within(cardFor('Total Payable')).getByText(/2 suppliers · 2 POs/)).toBeInTheDocument();

    expect(within(cardFor('Total Overdue')).getByText(formatCurrency(1000))).toBeInTheDocument();
    expect(within(cardFor('Total Overdue')).getByText(/45\.5% of the book/)).toBeInTheDocument();

    expect(within(cardFor('Oldest Debt')).getByText(`${formatNumber(100)}d`)).toBeInTheDocument();
    expect(within(cardFor('Current (Not Due)')).getByText(formatCurrency(500))).toBeInTheDocument();

    // The reconciliation cards: 2,200 on screen + 250 with no supplier = the
    // 2,450 the AP control account actually holds.
    expect(within(cardFor('AP Control Account')).getByText(formatCurrency(2450))).toBeInTheDocument();
    expect(within(cardFor('AP Control Account')).getByText('2101 Accounts Payable')).toBeInTheDocument();
    expect(within(cardFor('Unallocated to Orders')).getByText(formatCurrency(700))).toBeInTheDocument();
    expect(within(cardFor('No Supplier')).getByText(formatCurrency(250))).toBeInTheDocument();
  });

  it('reads the bucket ladder from the summary breakdown', async () => {
    await generate();

    expect(within(cardFor('90+ Days')).getByText(formatCurrency(1000))).toBeInTheDocument();
    expect(within(cardFor('90+ Days')).getByText(/1 suppliers · 45\.5%/)).toBeInTheDocument();

    // Empty buckets stay visible so the ladder does not reflow as debt ages.
    expect(within(cardFor('61-90 Days Overdue')).getByText(formatCurrency(0))).toBeInTheDocument();
    expect(within(cardFor('61-90 Days Overdue')).getByText(/0 suppliers/)).toBeInTheDocument();
  });

  it('drills into a bucket when its card is clicked', async () => {
    render(<APAgingPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Supplier$/ })).toBeInTheDocument());

    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('90+ Days Overdue')).getByText('90+ Days Overdue'));
    });

    await waitFor(() => expect(captured.params.bucket).toBe('d_90_plus'));

    // Clicking the active card clears the drill-down.
    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('90+ Days Overdue')).getByText('90+ Days Overdue'));
    });

    await waitFor(() => expect(captured.params.bucket).toBeUndefined());
  });

  it('passes each filter through under its backend param name', async () => {
    render(<APAgingPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Supplier$/ })).toBeInTheDocument());

    captured.params = {};
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-All suppliers'));
    });
    fireEvent.change(selectHaving('Inactive'), { target: { value: 'inactive' } });
    fireEvent.change(screen.getByPlaceholderText(/Supplier, code, phone or email/i), { target: { value: 'kamil' } });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.supplier_id).toBe('sup-1'));
    expect(captured.params.supplier_status).toBe('inactive');
    expect(captured.params.search).toBe('kamil');
  });

  it('sends the overdue-only switch as a flag', async () => {
    render(<APAgingPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Supplier$/ })).toBeInTheDocument());

    captured.params = {};
    fireEvent.click(screen.getByRole('checkbox', { name: /Overdue only/i }));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.only_overdue).toBe(1));
  });

  it('renders the totals footer from the summary', async () => {
    await generate();

    const footer = screen.getByText('Totals').closest('tr') as HTMLElement;
    expect(cellTextFor(footer, 'Total Payable')).toBe(formatCurrency(2200));
    expect(cellTextFor(footer, 'Current')).toBe(formatCurrency(500));
    expect(cellTextFor(footer, '90+ Days')).toBe(formatCurrency(1000));
    expect(cellTextFor(footer, 'Total Overdue')).toBe(formatCurrency(1000));
    expect(cellTextFor(footer, 'POs')).toBe(formatNumber(2));
    expect(cellTextFor(footer, 'Unallocated')).toBe(formatCurrency(700));
  });

  it('clears the data and filters on reset', async () => {
    await generate();
    expect(screen.getByRole('columnheader', { name: /^Supplier$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset$/i }));
    await waitFor(() => expect(screen.queryByRole('columnheader', { name: /^Supplier$/ })).not.toBeInTheDocument());
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.apAging = vi.fn(async () => {
      throw { response: { data: { message: 'The bucket must be one of: current, d_1_30, d_31_60, d_61_90, d_90_plus.' } } };
    }) as any;

    render(<APAgingPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(screen.getByText(/The bucket must be one of/)).toBeInTheDocument());
  });
});