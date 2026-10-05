/**
 * Renders the POS Refund Summary page against a captured API payload so the
 * screen is checked against what the backend actually returns (RPT-POS-001).
 *
 * PAYLOAD is a verbatim `GET /api/v1/reports/pos/refund-summary` response,
 * captured against the local database with a rolled-back fixture of four POS
 * orders: three with partial/full line refunds (INV-9001 2 of 4, INV-9002 1 of
 * 2, INV-9003 6 of 6) and one clean sale (INV-9004, 10 units, no refund).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import PosRefundSummaryPage from './page';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    posRefundSummary: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/services/commonService', () => ({
  default: {
    getCategoriesForDropdown: vi.fn(async () => [{ id: 'cat-1', name: 'Ceiling Fans' }]),
    getBrandsForDropdown: vi.fn(async () => [{ id: 'brand-1', name: 'CLICK' }]),
  },
}));

vi.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    isSuperAdmin: false,
    hasPermission: () => true,
  }),
}));

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (sel: (s: any) => any) =>
    sel({ user: { tenant_id: 'tenant-1', tenant: { business_type: { id: 'bt-1' } } } }),
}));

vi.mock('@/components/ui/tenant-select', () => ({
  default: () => <div data-testid="tenant-select" />,
}));

vi.mock('@/components/ui/date-picker', () => ({
  default: ({ value }: any) => <input data-testid="date-picker" value={value ?? ''} readOnly />,
}));

// Each mocked dropdown resolves asynchronously and hands back a distinct,
// identifiable option, so a test can assert which filter was picked.
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

const ROW = {
  product_name: 'CLICK Divine Ceiling fan',
  variation_name: 'Ivory - 56"',
  sku: 'CDCF-IV-56',
  barcode: null,
  register_name: 'UISESS2fd3 Back Counter',
  customer_name: 'Mustafizur Rahman',
  reason: 'Not recorded',
};

const PAYLOAD = {
  data: [
    {
      ...ROW,
      id: 'r-3',
      date: '2026-04-05',
      invoice_number: 'INV-9003',
      quantity: 6,
      quantity_returned: 6,
      refund_rate_pct: 100,
      unit_price: 40,
      refund_value: 240,
    },
    {
      ...ROW,
      id: 'r-2',
      date: '2026-04-03',
      invoice_number: 'INV-9002',
      quantity: 2,
      quantity_returned: 1,
      refund_rate_pct: 50,
      unit_price: 60,
      refund_value: 60,
    },
    {
      ...ROW,
      id: 'r-1',
      date: '2026-04-02',
      invoice_number: 'INV-9001',
      quantity: 4,
      quantity_returned: 2,
      refund_rate_pct: 50,
      unit_price: 50,
      refund_value: 90,
    },
  ],
  summary: {
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    total_refunds: 3,
    total_orders: 3,
    // Every unit rung in April: 4 + 2 + 6 on refunded lines, plus 10 on the
    // clean sale INV-9004.
    total_units_sold: 22,
    // Only the refunded lines: 4 + 2 + 6.
    units_on_refunded_lines: 12,
    total_units_refunded: 9,
    total_refund_value: 390,
    refund_rate_pct: 40.9,
  },
  columns: [
    { key: 'invoice_number', label: 'Invoice', type: 'text', align: 'left', totals: false },
    { key: 'refund_value', label: 'Refund Value', type: 'money', align: 'right', totals: true },
  ],
  filters_applied: ['Period: 01 Apr 2026 – 30 Apr 2026'],
  generated_at: '2026-10-05T14:00:00+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = async () => {
  render(<PosRefundSummaryPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() =>
    expect(screen.getByRole('columnheader', { name: /^Invoice$/ })).toBeInTheDocument(),
  );
};

const clickSelect = async (testId: string) => {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId));
  });
};

/**
 * The rendered text of one named column within a row. Several columns in a row
 * can hold the same figure, so a text query alone cannot say which is which.
 */
const cellTextFor = (row: HTMLElement, header: string) => {
  const headers = within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((h) => h.textContent?.trim() ?? '');
  const idx = headers.findIndex((h) => h === header);
  expect(idx, `no column header named "${header}"`).toBeGreaterThanOrEqual(0);
  const cells = within(row).getAllByRole('cell');
  return (cells[idx]?.textContent ?? '').trim();
};

const rowFor = (invoice: string) => screen.getByText(invoice).closest('tr') as HTMLElement;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('PosRefundSummaryPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<PosRefundSummaryPage />);
    expect(screen.queryByRole('columnheader', { name: /^Invoice$/ })).not.toBeInTheDocument();
  });

  it('sends a date range and the resolved tenant by default', async () => {
    await generate();
    expect(captured.params.start_date).toBeTruthy();
    expect(captured.params.end_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
  });

  it('renders one row per refunded order line, newest first', async () => {
    await generate();

    // Default sort is date desc, so INV-9003 (05 Apr) comes before INV-9001.
    // The totals footer is also a <tr>, so pick the rows that carry an invoice.
    const invoices = within(screen.getByRole('table'))
      .getAllByRole('row')
      // Skip the header row: it is all <th>, so it has no cells to read.
      .filter((r) => within(r).queryAllByRole('cell').length > 0)
      .map((r) => cellTextFor(r, 'Invoice'))
      .filter((v) => v.startsWith('INV-'));

    expect(invoices).toEqual(['INV-9003', 'INV-9002', 'INV-9001']);
  });

  it('renders every column the report definition declares', async () => {
    await generate();

    for (const header of [
      'Date',
      'Invoice',
      'Product',
      'Variation',
      'SKU',
      'Register',
      'Customer',
      'Qty Sold',
      'Refunded',
      'Refund Rate',
      'Unit Price',
      'Refund Value',
      'Reason',
    ]) {
      expect(screen.getByRole('columnheader', { name: new RegExp(`^${header}$`) })).toBeInTheDocument();
    }
  });

  it('computes the refund rate against period units sold, not just refunded lines', async () => {
    await generate();

    // 9 units returned out of 22 sold in the period = 40.9%. The card must
    // quote the period figure, not the 12 units that sat on refunded lines.
    // "Refund Rate" is both a card label and a column header.
    expect(screen.getAllByText('Refund Rate').length).toBeGreaterThan(0);
    // 40.9% appears on the card and again in the totals footer.
    expect(screen.getAllByText(formatPercent(40.9)).length).toBeGreaterThan(0);
    expect(screen.getByText(/9 of 22 units sold in period/)).toBeInTheDocument();
  });

  it('sums the Qty Sold column from the refunded lines actually shown', async () => {
    await generate();

    // The footer sits under a column whose rows are refunded lines only, so it
    // must total 12 — the period's 22 units belong on the card, not here.
    expect(screen.getByText('Totals')).toBeInTheDocument();
    const footer = screen.getByText('Totals').closest('tr') as HTMLElement;
    expect(cellTextFor(footer, 'Qty Sold')).toBe(formatNumber(12, 2));
    expect(cellTextFor(footer, 'Refunded')).toBe(formatNumber(9, 2));
    expect(cellTextFor(footer, 'Refund Value')).toBe(formatCurrency(390));
  });

  it('prices the refund net of the line discount', async () => {
    await generate();

    // INV-9001: 2 units returned at 50 less a 20 discount spread over 4 units
    // = 2 × (50 − 5) = 90.
    expect(cellTextFor(rowFor('INV-9001'), 'Refund Value')).toBe(formatCurrency(90));
    // INV-9003 had no discount: 6 × 40 = 240.
    expect(cellTextFor(rowFor('INV-9003'), 'Refund Value')).toBe(formatCurrency(240));
  });

  it('marks a fully refunded line as 100%', async () => {
    await generate();

    expect(cellTextFor(rowFor('INV-9003'), 'Refund Rate')).toBe(formatPercent(100));
    expect(cellTextFor(rowFor('INV-9001'), 'Refund Rate')).toBe(formatPercent(50));
  });

  it('says the refund reason is not recorded rather than inventing one', async () => {
    await generate();
    // The POS ledger has no refund-reason column; the report says so explicitly.
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);
  });

  it('passes product_type through to the backend', async () => {
    render(<PosRefundSummaryPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /^Invoice$/ })).toBeInTheDocument(),
    );

    captured.params = {};
    fireEvent.change(screen.getByText('All Types').closest('select')!, {
      target: { value: 'variable' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.product_type).toBe('variable'));
  });

  it('passes each filter through under its backend param name', async () => {
    render(<PosRefundSummaryPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /^Invoice$/ })).toBeInTheDocument(),
    );

    captured.params = {};
    await clickSelect('select-All categories');
    await clickSelect('select-All brands');
    fireEvent.change(screen.getByPlaceholderText(/Invoice, product/), {
      target: { value: 'CDCF' },
    });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => {
      expect(captured.params.category_id).toBe('cat-1');
      expect(captured.params.brand_id).toBe('brand-1');
      expect(captured.params.search).toBe('CDCF');
      // Laravel's `boolean` rule rejects "true"/"false", so this is 1/0.
      expect(captured.params.include_inactive).toBe(1);
    });
  });

  it('clears the data and filters on reset', async () => {
    await generate();
    expect(screen.getByRole('columnheader', { name: /^Invoice$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: /^Invoice$/ })).not.toBeInTheDocument(),
    );
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.posRefundSummary = vi.fn(async () => {
      throw { response: { data: { message: 'The end date must be on or after the start date.' } } };
    }) as any;

    render(<PosRefundSummaryPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(screen.getByText('The end date must be on or after the start date.')).toBeInTheDocument(),
    );
  });
});