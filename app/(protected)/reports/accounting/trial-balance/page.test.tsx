/**
 * Renders the Trial Balance page against a captured API payload so the screen is
 * checked against what the backend actually returns (RPT-ACC-004).
 *
 * The payload is a verbatim `GET /api/v1/reports/accounting/trial-balance`
 * response built from a rolled-back fixture for one tenant:
 *
 * - Cash: 1,000 opening (posted 8 months before the period), +500 DR and
 *   -200 CR inside it, so the closing balance is 1,300 and the period movement
 *   is 500/200;
 * - Accounts Payable: 1,000 CR opening, no movement — a liability that must read
 *   as a credit balance rather than a negative number;
 * - Sales Revenue: 500 CR opening, then a 600 DR entry that flips it to a 100 DR
 *   balance, which is off-side for a revenue account and must be flagged;
 * - Rent Expense: 200 DR, normal side;
 * - A Drifted Asset: no journal lines at all but a cached balance of 777, so
 *   `drift` is non-zero and the account must still appear.
 *
 * Closing debits 1,300 + 200 = 1,500 and closing credits 1,000 + 500 = 1,500,
 * so the books balance while an account is still sitting on the wrong side.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import TrialBalancePage from './page';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

// ── Mocks ────────────────────────────────────────────────────────────────────

const captured: { params: Record<string, any> } = { params: {} };

vi.mock('@/services/reportService', () => ({
  default: {
    trialBalance: vi.fn(async (params: Record<string, any>) => {
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
      data-testid={`date-${value ?? 'empty'}`}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
    />
  ),
}));

vi.mock('@/lib/notifications', () => ({
  notify: { error: vi.fn(), warning: vi.fn() },
}));

// ── Captured API payload ─────────────────────────────────────────────────────

const CASH = {
  account_id: 'acc-cash',
  code: '1000',
  name: 'Cash',
  account_type: 'asset',
  account_subtype: 'cash',
  parent_id: null,
  is_active: true,
  opening_balance: 1000,
  period_debit: 500,
  period_credit: 200,
  balance: 1300,
  balance_side: 'debit' as const,
  is_abnormal: false,
  cached_balance: 1300,
  ledger_balance: 1300,
  drift: 0,
  entry_count: 3,
  last_entry_date: '2026-09-04',
};

const PAYABLE = {
  ...CASH,
  account_id: 'acc-ap',
  code: '2101',
  name: 'Accounts Payable',
  account_type: 'liability',
  account_subtype: 'accounts_payable',
  opening_balance: -1000,
  period_debit: 0,
  period_credit: 0,
  balance: -1000,
  balance_side: 'credit' as const,
  cached_balance: 1000,
  ledger_balance: 1000,
  entry_count: 1,
  last_entry_date: '2026-02-01',
};

const REVENUE = {
  ...CASH,
  account_id: 'acc-rev',
  code: '4000',
  name: 'Sales Revenue',
  account_type: 'revenue',
  account_subtype: 'sales_revenue',
  opening_balance: 500,
  period_debit: 600,
  period_credit: 0,
  balance: 100,
  balance_side: 'debit' as const,
  is_abnormal: true,
  cached_balance: -100,
  ledger_balance: -100,
  entry_count: 2,
  last_entry_date: '2026-09-01',
};

const EXPENSE = {
  ...CASH,
  account_id: 'acc-exp',
  code: '6000',
  name: 'Rent Expense',
  account_type: 'expense',
  account_subtype: 'operating_expense',
  opening_balance: 0,
  period_debit: 200,
  period_credit: 0,
  balance: 200,
  balance_side: 'debit' as const,
  cached_balance: 200,
  ledger_balance: 200,
  entry_count: 1,
  last_entry_date: '2026-09-04',
};

const DRIFTED = {
  ...CASH,
  account_id: 'acc-drift',
  code: '1950',
  name: 'Drifted Asset',
  account_type: 'asset',
  account_subtype: 'other',
  opening_balance: 0,
  period_debit: 0,
  period_credit: 0,
  balance: 0,
  balance_side: 'flat' as const,
  cached_balance: 777,
  ledger_balance: 0,
  drift: 777,
  entry_count: 0,
  last_entry_date: null,
};

const PAYLOAD = {
  data: [CASH, PAYABLE, REVENUE, EXPENSE, DRIFTED],
  summary: {
    start_date: '2026-09-01',
    end_date: '2026-09-30',
    account_count: 5,
    active_account_count: 5,
    total_debit: 1600,
    total_credit: 1500,
    variance: 100,
    is_balanced: false,
    period_debit: 1300,
    period_credit: 200,
    period_variance: 1100,
    is_period_balanced: false,
    abnormal_account_count: 1,
    drift_account_count: 1,
    total_drift: 777,
    by_account_type: [
      { key: 'asset', label: 'Asset', count: 3, debit: 1300, credit: 0, balance: 1300 },
      { key: 'liability', label: 'Liability', count: 1, debit: 0, credit: 1000, balance: -1000 },
      { key: 'equity', label: 'Equity', count: 0, debit: 0, credit: 0, balance: 0 },
      { key: 'revenue', label: 'Revenue', count: 1, debit: 100, credit: 0, balance: 100 },
      { key: 'expense', label: 'Expense', count: 1, debit: 200, credit: 0, balance: 200 },
      { key: 'contra', label: 'Contra', count: 0, debit: 0, credit: 0, balance: 0 },
    ],
  },
  columns: [],
  filters_applied: ['Period: 01 Sep 2026 to 30 Sep 2026'],
  generated_at: '2026-10-05T15:00:00+06:00',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Exact-text matcher: report headers such as "Last Entry" are not regexes. */
const escapeRegExp = (value: string) =>
  new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

const generate = async () => {
  render(<TrialBalancePage />);
  fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
  await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Code$/ })).toBeInTheDocument());
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

const rowFor = (code: string) => within(screen.getByRole('table')).getByText(code).closest('tr') as HTMLElement;

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
 * card values overlap table cells — ৳1,300.00 is both a card value and a cell.
 */
const cardFor = (label: string) => {
  const el = screen.getAllByText(label).find(n => n.closest('div.rounded-md'));
  expect(el, `no summary card labelled "${label}"`).toBeTruthy();
  return el!.closest('div.rounded-md') as HTMLElement;
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe('TrialBalancePage', () => {
  beforeEach(() => {
    captured.params = {};
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('shows the empty state before a report is generated', () => {
    render(<TrialBalancePage />);
    expect(screen.queryByRole('columnheader', { name: /^Code$/ })).not.toBeInTheDocument();
  });

  it('defaults to the current month, hiding empty accounts, for the resolved tenant', async () => {
    await generate();
    const now = new Date();
    expect(captured.params.start_date).toBe(
      new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
    );
    expect(captured.params.end_date).toBeTruthy();
    expect(captured.params.only_with_activity).toBe(1);
    expect(captured.params.only_abnormal).toBe(0);
    expect(captured.params.only_drift).toBe(0);
    expect(captured.params.include_inactive).toBe(0);
    expect(captured.params.tenant_id).toBe('tenant-1');
  });

  it('renders every column the report definition declares', async () => {
    await generate();

    for (const header of [
      'Code',
      'Account',
      'Type',
      'Opening',
      'Debit',
      'Credit',
      'Balance',
      'Side',
      'Check',
      'Cached',
      'Drift',
      'Entries',
      'Last Entry',
    ]) {
      expect(screen.getByRole('columnheader', { name: escapeRegExp(header) })).toBeInTheDocument();
    }
  });

  it('carries opening + movement into the closing balance', async () => {
    await generate();

    const cash = rowFor('1000');
    expect(cellTextFor(cash, 'Opening')).toBe(formatCurrency(1000));
    expect(cellTextFor(cash, 'Debit')).toBe(formatCurrency(500));
    expect(cellTextFor(cash, 'Credit')).toBe(formatCurrency(200));
    expect(cellTextFor(cash, 'Balance')).toBe(`Dr ${formatCurrency(1300)}`);
  });

  it('labels a credit balance as credit rather than a negative number', async () => {
    await generate();

    // The legacy report rendered this as -1000 with no indication of side.
    const ap = rowFor('2101');
    expect(cellTextFor(ap, 'Balance')).toBe(`Cr ${formatCurrency(1000)}`);
    expect(cellTextFor(ap, 'Side')).toBe('Credit');
    expect(cellTextFor(ap, 'Opening')).toBe(formatCurrency(1000));
  });

  it('flags a balance sitting on the wrong side for its account type', async () => {
    await generate();

    expect(cellTextFor(rowFor('4000'), 'Check')).toBe('Off-side');
    expect(cellTextFor(rowFor('4000'), 'Balance')).toBe(`Dr ${formatCurrency(100)}`);

    // A correctly-sided account shows nothing rather than a column of OKs.
    expect(cellTextFor(rowFor('1000'), 'Check')).toBe('');
    expect(cellTextFor(rowFor('6000'), 'Check')).toBe('');
  });

  it('dims zero figures instead of printing ৳0.00', async () => {
    await generate();

    // The drifted asset has no movement at all.
    const drifted = rowFor('1950');
    expect(cellTextFor(drifted, 'Debit')).toBe('—');
    expect(cellTextFor(drifted, 'Balance')).toBe('—');
    expect(cellTextFor(drifted, 'Side')).toBe('Flat');
  });

  it('reports cache drift against the ledger', async () => {
    await generate();

    expect(cellTextFor(rowFor('1950'), 'Cached')).toBe(formatCurrency(777));
    expect(cellTextFor(rowFor('1950'), 'Drift')).toBe(formatCurrency(777));
    // A reconciled account shows a dash, not a zero.
    expect(cellTextFor(rowFor('1000'), 'Drift')).toBe('—');
  });

  it('leads with the balance verdict and the variance behind it', async () => {
    await generate();

    const verdict = cardFor('Books Balanced');
    expect(within(verdict).getByText('No')).toBeInTheDocument();
    expect(within(verdict).getByText(`variance ${formatCurrency(100)}`)).toBeInTheDocument();

    expect(within(cardFor('Total Debit')).getByText(formatCurrency(1600))).toBeInTheDocument();
    expect(within(cardFor('Total Credit')).getByText(formatCurrency(1500))).toBeInTheDocument();
    expect(within(cardFor('Accounts')).getByText(formatNumber(5))).toBeInTheDocument();
    expect(within(cardFor('Accounts')).getByText(`${formatNumber(5)} active`)).toBeInTheDocument();

    // The period's own movement is a separate verdict: a period can net out
    // while the closing balances do not.
    const movement = cardFor('Period Movement');
    expect(within(movement).getByText(`Off ${formatCurrency(1100)}`)).toBeInTheDocument();
  });

  it('counts off-side balances and cache drift', async () => {
    await generate();

    expect(within(cardFor('Off-Side Balances')).getByText(formatNumber(1))).toBeInTheDocument();
    expect(within(cardFor('Off-Side Balances')).getByText('balance on the wrong side')).toBeInTheDocument();

    expect(within(cardFor('Cache Drift')).getByText(formatNumber(1))).toBeInTheDocument();
    expect(within(cardFor('Cache Drift')).getByText(`${formatCurrency(777)} off the ledger`)).toBeInTheDocument();
  });

  it('reads the type ladder from the summary breakdown', async () => {
    await generate();

    expect(within(cardFor('Liability')).getByText(formatCurrency(1000))).toBeInTheDocument();
    expect(within(cardFor('Liability')).getByText(/1 accounts/)).toBeInTheDocument();

    // Types with no accounts are omitted rather than shown at zero. Scoped to
    // the card grid, because "Contra" is also an account-type filter option.
    const cards = cardFor('Liability').parentElement?.parentElement as HTMLElement;
    expect(within(cards).queryByText('Contra')).not.toBeInTheDocument();
    expect(within(cards).queryByText('Equity')).not.toBeInTheDocument();
  });

  it('drills into off-side balances when its card is clicked', async () => {
    render(<TrialBalancePage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Code$/ })).toBeInTheDocument());

    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('Off-Side Balances')).getByText('Off-Side Balances'));
    });

    await waitFor(() => expect(captured.params.only_abnormal).toBe(1));

    // Clicking again clears it.
    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('Off-Side Balances')).getByText('Off-Side Balances'));
    });

    await waitFor(() => expect(captured.params.only_abnormal).toBe(0));
  });

  it('drills into cache drift when its card is clicked', async () => {
    render(<TrialBalancePage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));
    await waitFor(() => expect(screen.getByRole('columnheader', { name: /^Code$/ })).toBeInTheDocument());

    captured.params = {};
    await act(async () => {
      fireEvent.click(within(cardFor('Cache Drift')).getByText('Cache Drift'));
    });

    await waitFor(() => expect(captured.params.only_drift).toBe(1));
  });

  it('passes each filter through under its backend param name', async () => {
    await generate();

    captured.params = {};
    fireEvent.change(selectHaving('All Types'), { target: { value: 'liability' } });
    fireEvent.change(screen.getByPlaceholderText(/Account code or name/i), {
      target: { value: 'payable' },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.account_type).toBe('liability'));
    expect(captured.params.search).toBe('payable');
  });

  it('sends the option switches as flags', async () => {
    await generate();

    captured.params = {};
    fireEvent.click(screen.getByRole('checkbox', { name: /Include inactive/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Hide empty accounts/i }));
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(captured.params.include_inactive).toBe(1));
    expect(captured.params.only_with_activity).toBe(0);
  });

  it('refuses a period that ends before it starts, without calling the API', async () => {
    render(<TrialBalancePage />);

    await act(async () => {
      fireEvent.change(screen.getByTestId(`date-${new Date().toISOString().split('T')[0]}`), {
        target: { value: '2020-01-01' },
      });
    });

    const reportService = (await import('@/services/reportService')).default;
    captured.params = {};
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    expect(screen.getByText('Start date cannot be after end date.')).toBeInTheDocument();
    expect(captured.params).toEqual({});
    expect(reportService.trialBalance).not.toHaveBeenCalled();
  });

  it('renders the totals footer from the summary', async () => {
    await generate();

    const footer = screen.getByText('Totals').closest('tr') as HTMLElement;
    // Only the movement pair and the entry count total: the balance columns are
    // signed, so footing them would say nothing.
    expect(cellTextFor(footer, 'Debit')).toBe(formatCurrency(1300));
    expect(cellTextFor(footer, 'Credit')).toBe(formatCurrency(200));
    expect(cellTextFor(footer, 'Entries')).toBe(formatNumber(7));
  });

  it('clears the data and filters on reset', async () => {
    await generate();
    expect(screen.getByRole('columnheader', { name: /^Code$/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reset$/i }));
    await waitFor(() => expect(screen.queryByRole('columnheader', { name: /^Code$/ })).not.toBeInTheDocument());
  });

  it('surfaces a backend validation message', async () => {
    const reportService = (await import('@/services/reportService')).default;
    reportService.trialBalance = vi.fn(async () => {
      throw { response: { data: { message: 'The end date cannot be before the start date.' } } };
    }) as any;

    render(<TrialBalancePage />);
    fireEvent.click(screen.getByRole('button', { name: /generate report/i }));

    await waitFor(() => expect(screen.getByText(/The end date cannot be before/)).toBeInTheDocument());
  });
});