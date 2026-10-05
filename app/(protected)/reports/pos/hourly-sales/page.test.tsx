/**
 * Renders the Hourly Sales page against a captured API payload so the screen is
 * checked against what the backend actually returns (RPT-POS-002).
 *
 * The payload is built from a verbatim live `GET /api/v1/reports/pos/hourly-sales`
 * response, captured against the local database with a rolled-back fixture of POS
 * orders in June 2026: two completed sales at 09:00 (২ units at 100 + 1 at 80)
 * and one at 13:00 (3 units at 50), plus a cancelled 999 sale at 19:00 that the
 * backend correctly ignores. The backend always returns all 24 hours zero-filled,
 * so the inactive ones are reproduced here rather than omitted.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import HourlySalesPage from './page';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    hourlySales: vi.fn(async (params: Record<string, any>) => {
      captured.params = params;
      return PAYLOAD;
    }),
    exportReport: vi.fn(async () => new Blob(['x'])),
  },
}));

vi.mock('@/services', () => ({
  posRegisterService: {
    dropdown: vi.fn(async () => [{ id: 'reg-1', name: 'Front Counter' }]),
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

const ZERO_HOUR = {
  order_count: 0,
  units_sold: 0,
  revenue: 0,
  cost: 0,
  gross_profit: 0,
  avg_order_value: 0,
  units_per_order: 0,
  share_pct: 0,
};

/** All 24 hours, zero-filled, exactly as the backend returns them. */
const DATA = Array.from({ length: 24 }, (_, hour) => {
  const base = {
    ...ZERO_HOUR,
    hour,
    hour_label: `${String(hour).padStart(2, '0')}:00`,
    hour_start: `2000-01-01 ${String(hour).padStart(2, '0')}:00:00`,
  };

  if (hour === 9) {
    // 2 orders, 3 units, ৳280 revenue against ৳170 cost.
    return {
      ...base,
      order_count: 2,
      units_sold: 3,
      revenue: 280,
      cost: 170,
      gross_profit: 110,
      avg_order_value: 140,
      units_per_order: 1.5,
      share_pct: 65.1,
    };
  }
  if (hour === 13) {
    // 1 order, 3 units, ৳150 revenue against ৳90 cost.
    return {
      ...base,
      order_count: 1,
      units_sold: 3,
      revenue: 150,
      cost: 90,
      gross_profit: 60,
      avg_order_value: 150,
      units_per_order: 3,
      share_pct: 34.9,
    };
  }
  return base;
});

const PAYLOAD = {
  data: DATA,
  summary: {
    start_date: '2026-06-01',
    end_date: '2026-06-30',
    total_revenue: 430,
    total_cost: 260,
    gross_profit: 170,
    order_count: 3,
    total_units: 6,
    avg_order_value: 143.33,
    trading_hours: 2,
    avg_hourly_revenue: 215,
    busiest_hour: [{ label: '09:00', value: 280, share_pct: 65.1 }],
  },
  columns: [
    { key: 'hour_label', label: 'Hour', type: 'text', align: 'left', totals: false },
    { key: 'revenue', label: 'Revenue', type: 'money', align: 'right', totals: true },
  ],
  filters_applied: ['Period: 01 Jun 2026 – 30 Jun 2026'],
  generated_at: '2026-10-05T15:00:00+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const generate = async () => {
  render(<HourlySalesPage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() =>
    expect(screen.getByRole('columnheader', { name: /^Hour$/ })).toBeInTheDocument(),
  );
};

/** The rendered text of one named column within a row. */
const cellTextFor = (row: HTMLElement, header: string) => {
  const headers = within(screen.getByRole('table'))
    .getAllByRole('columnheader')
    .map((h) => h.textContent?.trim() ?? '');
  const idx = headers.findIndex((h) => h === header);
  expect(idx, `no column header named "${header}"`).toBeGreaterThanOrEqual(0);
  const cells = within(row).getAllByRole('cell');
  return (cells[idx]?.textContent ?? '').trim();
};

const rowFor = (hour: string) =>
  within(screen.getByRole('table')).getByText(hour).closest('tr') as HTMLElement;

/**
 * A summary card's own content, located from its label. Scoping matters because
 * card values overlap table cells — the busiest hour "09:00" is both a card
 * value and a row in the table.
 */
const cardFor = (label: string) => {
  // Several labels are shared with column headers, so take the match that
  // actually sits inside a summary card rather than a table cell.
  const el = screen.getAllByText(label).find((n) => n.closest('div.rounded-md'));
  expect(el, `no summary card labelled "${label}"`).toBeTruthy();
  return el!.closest('div.rounded-md') as HTMLElement;
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('HourlySalesPage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<HourlySalesPage />);
    expect(screen.queryByRole('columnheader', { name: /^Hour$/ })).not.toBeInTheDocument();
  });

  it('sends a date range and the resolved tenant by default', async () => {
    await generate();
    expect(captured.params.start_date).toBeTruthy();
    expect(captured.params.end_date).toBeTruthy();
    expect(captured.params.tenant_id).toBe('tenant-1');
  });

  it('lists all 24 hours so quiet periods stay visible', async () => {
    await generate();

    // The zero-filled spine is the point of the report: a dead hour must read as
    // zero, not disappear, or a slow afternoon looks like no data at all.
    const rows = within(screen.getByRole('table'))
      .getAllByRole('row')
      .filter((r) => within(r).queryAllByRole('cell').length > 0)
      .map((r) => cellTextFor(r, 'Hour'))
      .filter((h) => h.endsWith(':00'));

    expect(rows).toHaveLength(24);
    expect(rows[0]).toBe('00:00');
    expect(rows[23]).toBe('23:00');
    expect(rows).toContain('09:00');
    expect(rows).toContain('19:00');
  });

  it('renders every column the report definition declares', async () => {
    await generate();

    for (const header of [
      'Hour',
      'Orders',
      'Units',
      'Revenue',
      'Cost',
      'Gross Profit',
      'Avg Order',
      'Units / Order',
      'Share %',
    ]) {
      expect(screen.getByRole('columnheader', { name: new RegExp(`^${header.replace('/', '\\/')}$`) })).toBeInTheDocument();
    }

    // The column is share of the *period*, not of a single day.
    expect(screen.queryByRole('columnheader', { name: /Share of Day/ })).not.toBeInTheDocument();
  });

  it('shows the completed-sale figures and keeps a dead hour at zero', async () => {
    await generate();

    // 09:00 — 2 orders, 3 units, ৳280 revenue, ৳170 cost, ৳110 profit.
    const nine = rowFor('09:00');
    expect(cellTextFor(nine, 'Orders')).toBe('2');
    expect(cellTextFor(nine, 'Units')).toBe(formatNumber(3));
    expect(cellTextFor(nine, 'Revenue')).toBe(formatCurrency(280));
    expect(cellTextFor(nine, 'Cost')).toBe(formatCurrency(170));
    expect(cellTextFor(nine, 'Gross Profit')).toBe(formatCurrency(110));

    // 19:00 held a cancelled 999 sale; the backend drops it, so the hour is zero.
    const nineteen = rowFor('19:00');
    expect(cellTextFor(nineteen, 'Orders')).toBe('0');
    expect(cellTextFor(nineteen, 'Revenue')).toBe(formatCurrency(0));
  });

  it('renders the summary cards from the report summary', async () => {
    await generate();

    expect(screen.getByText('Busiest Hour')).toBeInTheDocument();
    expect(screen.getByText('Trading Hours')).toBeInTheDocument();

    // "Revenue", "Orders" and "Avg Order" are each both a card label and a
    // column header, so they are matched as "present" rather than "unique".
    expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Orders').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Avg Order').length).toBeGreaterThan(0);

    // Card values come from the summary, scoped to their own card.
    expect(within(cardFor('Revenue')).getByText(formatCurrency(430))).toBeInTheDocument();
    expect(within(cardFor('Revenue')).getByText(/170.00 gross profit/)).toBeInTheDocument();
    expect(within(cardFor('Trading Hours')).getByText(formatNumber(2))).toBeInTheDocument();
  });

  it('reads the busiest hour from the summary breakdown', async () => {
    await generate();

    // busiest_hour is a [{ label, value, share_pct }] breakdown, not a flat map,
    // so the card reads "09:00" with "৳280.00 · 65.1% of revenue" beneath it.
    const card = cardFor('Busiest Hour');
    expect(within(card).getByText('09:00')).toBeInTheDocument();
    expect(within(card).getByText(/65\.1% of revenue/)).toBeInTheDocument();
  });

  it('averages revenue over trading hours only, not all 24', async () => {
    await generate();

    // 430 revenue over 2 trading hours = 215, not 430/24.
    expect(screen.getByText(/215.00 per trading hour/)).toBeInTheDocument();
  });

  it('renders the totals footer from the summary', async () => {
    await generate();

    const footer = screen.getByText('Totals').closest('tr') as HTMLElement;
    expect(cellTextFor(footer, 'Orders')).toBe(formatNumber(3));
    expect(cellTextFor(footer, 'Units')).toBe(formatNumber(6, 2));
    expect(cellTextFor(footer, 'Revenue')).toBe(formatCurrency(430));
    expect(cellTextFor(footer, 'Cost')).toBe(formatCurrency(260));
    expect(cellTextFor(footer, 'Gross Profit')).toBe(formatCurrency(170));
  });

  it('passes the register filter through as register_id', async () => {
    render(<HourlySalesPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /^Hour$/ })).toBeInTheDocument(),
    );

    captured.params = {};
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-All registers'));
    });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.register_id).toBe('reg-1'));
  });

  it('passes the hour search through under its backend param name', async () => {
    render(<HourlySalesPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /^Hour$/ })).toBeInTheDocument(),
    );

    captured.params = {};
    fireEvent.change(screen.getByPlaceholderText(/Hour, e.g/), { target: { value: '14' } });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.search).toBe('14'));
  });

  it('clears the data and filters on reset', async () => {
    await generate();
    expect(screen.getByRole('columnheader', { name: /^Hour$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));
    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: /^Hour$/ })).not.toBeInTheDocument(),
    );
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.hourlySales = vi.fn(async () => {
      throw { response: { data: { message: 'The end date must be on or after the start date.' } } };
    }) as any;

    render(<HourlySalesPage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() =>
      expect(screen.getByText('The end date must be on or after the start date.')).toBeInTheDocument(),
    );
  });
});