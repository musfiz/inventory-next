# REPORT_GENERATION_PLAN — UIMS Report & Analytics Roadmap

> **Generated:** 2026-07-08
> **System:** Universal Inventory Management System (UIMS) — Laravel 12 API + Next.js 16 UI
> **Architecture:** Multi-tenant SaaS (stancl/tenancy) with 18 business types
> **Sources analyzed:** `inventory-ui/docs/**`, `inventory-ui/prompts/**`, `inventory-api/prompts/**`, `inventory-ui/components/layout/sidebar.tsx`, `inventory-ui/services/**`, `inventory-ui/app/(protected)/reports/**`, `inventory-api/app/Models/**`, `inventory-api/database/migrations/**`, `inventory-api/app/Http/Controllers/Api/**`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State — What Already Exists](#2-current-state--what-already-exists)
3. [Report Infrastructure Architecture](#3-report-infrastructure-architecture)
4. [Report Categories by Module](#4-report-categories-by-module)
   - [4.1 Inventory & Stock Reports](#41-inventory--stock-reports)
   - [4.2 Sales Reports](#42-sales-reports)
   - [4.3 Purchase / Procurement Reports](#43-purchase--procurement-reports)
   - [4.4 POS Reports](#44-pos-reports)
   - [4.5 Accounting & Financial Reports](#45-accounting--financial-reports)
   - [4.6 Customer Reports](#46-customer-reports)
   - [4.7 Supplier Reports](#47-supplier-reports)
   - [4.8 Product / Catalog Reports](#48-product--catalog-reports)
   - [4.9 Warehouse & Logistics Reports](#49-warehouse--logistics-reports)
   - [4.10 Tax & Compliance Reports](#410-tax--compliance-reports)
   - [4.11 Manufacturing / Assembly Reports](#411-manufacturing--assembly-reports)
   - [4.12 HR / User Reports](#412-hr--user-reports)
   - [4.13 System / Admin Reports](#413-system--admin-reports)
   - [4.14 Business-Type Specific Reports](#414-business-type-specific-reports)
5. [Export & Print Capabilities](#5-export--print-capabilities)
6. [Frontend Implementation Plan](#6-frontend-implementation-plan)
7. [Backend Implementation Plan](#7-backend-implementation-plan)
8. [Permission Matrix](#8-permission-matrix)
9. [Implementation Phases](#9-implementation-phases)
10. [Report UI/UX Guidelines](#10-report-uiux-guidelines)

---

## 1. Executive Summary

The UIMS currently has **45+ report pages** in the frontend (across Accounting, Inventory, Sales, Purchase, POS, Customer, Supplier, Product, Warehouse, Tax, and System modules) and **8 backend report endpoints** (Trial Balance, P&L, Cash Flow, Balance Sheet, Ledger, AR Aging, AP Aging, Customer Statement). However, a full inventory management business requires **55+ reports** across all modules — the 45+ existing plus Manufacturing, HR, Business-type-specific, and advanced reports.

This document provides a complete catalog of every report needed to run a UIMS business, organized by module, with:
- Report name, purpose, and business value
- Data source (tables/models)
- Required backend endpoint
- Required frontend page
- Filters & parameters
- Export formats
- Permission key
- Implementation priority

### Key Numbers

| Metric | Current | Target |
|--------|---------|--------|
| Report pages in UI | 45+ | 55+ |
| Backend report endpoints | 8 | 60+ |
| Report categories | 10+ (all except Manufacturing, HR, Business-type) | 14 |
| Export formats supported | 0 | PDF, Excel, CSV, Print |
| Scheduled/automated reports | 0 | Email + Download |
| Tenant-based filtering | 45+ pages (all reports + accounting) | All pages |

---

## 2. Current State — What Already Exists

### 2.1 Frontend Report Pages (45+)

| # | Category | Report | Route | Service Method | Status |
|---|----------|--------|-------|---------------|--------|
|  1 | Accounting | Trial Balance | `/reports/trial-balance` | `accountService.trialBalance()` | Working |
|  2 | Accounting | Profit & Loss | `/reports/profit-loss` | `accountService.profitLoss()` | Working |
|  3 | Accounting | Cash Flow | `/reports/cash-flow` | `accountService.cashFlow()` | Working |
|  4 | Accounting | Balance Sheet | `/reports/balance-sheet` | `accountService.balanceSheet()` | Working |
|  5 | Accounting | Account Ledger | `/reports/ledger` | `accountService.ledger()` | Working |
|  6 | Accounting | AR Aging | `/reports/accounting/ar-aging` | `reportService.arAging()` | Working |
|  7 | Accounting | AP Aging | `/reports/accounting/ap-aging` | `reportService.apAging()` | Working |
|  8 | Accounting | Failed Journal | `/reports/accounting/failed-journal` | `reportService.failedJournal()` | Working |
|  9 | Purchase | Purchase List | `/reports/purchase-list` | `purchaseOrderService.list()` | Working |
| 10 | Inventory | Stock Valuation | `/reports/inventory/stock-valuation` | `reportService.stockValuation()` | Working |
| 11 | Inventory | Reorder Report | `/reports/inventory/reorder` | `reportService.reorderReport()` | Working |
| 12 | Inventory | Low Stock | `/reports/inventory/low-stock` | `reportService.lowStockReport()` | Working |
| 13 | Inventory | Stock Movement | `/reports/inventory/stock-movement` | `reportService.stockMovementReport()` | Working |
| 14 | Inventory | Stock Adjustment | `/reports/inventory/stock-adjustment` | `reportService.stockAdjustmentReport()` | Working |
| 15 | Inventory | Batch & Expiry | `/reports/inventory/batch-expiry` | `reportService.batchExpiryReport()` | Working |
| 16 | Inventory | Dead Stock | `/reports/inventory/dead-stock` | `reportService.deadStock()` | Working |
| 17 | Inventory | Stock Aging | `/reports/inventory/stock-aging` | `reportService.stockAging()` | Working |
| 18 | Inventory | ABC Analysis | `/reports/inventory/abc-analysis` | `reportService.abcAnalysis()` | Working |
| 19 | Inventory | Shrinkage | `/reports/inventory/shrinkage` | `reportService.shrinkageReport()` | Working |
| 20 | Inventory | Turnover | `/reports/inventory/turnover` | `reportService.turnoverReport()` | Working |
| 21 | Sales | Sales by Product | `/reports/sales/by-product` | `reportService.salesByProduct()` | Working |
| 22 | Sales | Sales by Customer | `/reports/sales/by-customer` | `reportService.salesByCustomer()` | Working |
| 23 | Sales | Sales by Category | `/reports/sales/by-category` | `reportService.salesByCategory()` | Working |
| 24 | Sales | Salesperson Performance | `/reports/sales/salesperson-performance` | `reportService.salespersonPerformance()` | Working |
| 25 | Sales | Profit Margin | `/reports/sales/profit-margin` | `reportService.profitMargin()` | Working |
| 26 | Sales | Return Analysis | `/reports/sales/return-analysis` | `reportService.returnAnalysis()` | Working |
| 27 | Sales | Sales Trend | `/reports/sales/sales-trend` | `reportService.salesTrend()` | Working |
| 28 | Purchase | PO Summary | `/reports/purchase/po-summary` | `reportService.poSummary()` | Working |
| 29 | Purchase | Supplier Performance | `/reports/purchase/supplier-performance` | `reportService.supplierPerformance()` | Working |
| 30 | Purchase | Purchase by Supplier | `/reports/purchase/by-supplier` | `reportService.purchaseBySupplier()` | Working |
| 31 | Purchase | GRN Register | `/reports/purchase/grn-register` | `reportService.grnRegister()` | Working |
| 32 | Purchase | Purchase Return | `/reports/purchase/purchase-return` | `reportService.purchaseReturn()` | Working |
| 33 | POS | Daily Sales | `/reports/pos/daily-sales` | `reportService.posDailySales()` | Working |
| 34 | POS | Session Summary | `/reports/pos/session-summary` | `reportService.posSessionSummary()` | Working |
| 35 | POS | Cashier Performance | `/reports/pos/cashier-performance` | `reportService.cashierPerformance()` | Working |
| 36 | POS | Hourly Sales | `/reports/pos/hourly-sales` | `reportService.hourlySales()` | Working |
| 37 | POS | Payment Breakdown | `/reports/pos/payment-breakdown` | `reportService.paymentBreakdown()` | Working |
| 38 | POS | Refund Summary | `/reports/pos/refund-summary` | `reportService.posRefundSummary()` | Working |
| 39 | Customer | Customer Statement | `/reports/customer/statement` | `reportService.customerStatement()` | Working |
| 40 | Customer | Customer Aging | `/reports/customer/aging` | `reportService.customerAging()` | Working |
| 41 | Customer | Customer Profitability | `/reports/customer/profitability` | `reportService.customerProfitability()` | Working |
| 42 | Supplier | Supplier Statement | `/reports/supplier/statement` | `reportService.supplierStatement()` | Working |
| 43 | Supplier | Supplier Aging | `/reports/supplier/aging` | `reportService.supplierAging()` | Working |
| 44 | Supplier | Supplier Scorecard | `/reports/supplier/scorecard` | `reportService.supplierScorecard()` | Working |
| 45 | Product | Product Profitability | `/reports/product/profitability` | `reportService.productProfitability()` | Working |
| 46 | Product | Price List | `/reports/product/price-list` | `reportService.priceList()` | Working |
| 47 | Product | Stock Status | `/reports/product/stock-status` | `reportService.stockStatus()` | Working |
| 48 | Warehouse | Stock Summary | `/reports/warehouse/stock-summary` | `reportService.warehouseStockSummary()` | Working |
| 49 | Warehouse | Bin Utilization | `/reports/warehouse/bin-utilization` | `reportService.binUtilization()` | Working |
| 50 | Warehouse | Stock Transfer | `/reports/warehouse/transfer` | `reportService.stockTransfer()` | Working |
| 51 | Tax | Tax Return | `/reports/tax/return` | `reportService.taxReturn()` | Working |
| 52 | Tax | Tax Summary | `/reports/tax/summary` | `reportService.taxSummary()` | Working |
| 53 | System | Audit Log | `/reports/system/audit-log` | `reportService.auditLog()` | Working |
| 54 | System | Activity Log | `/reports/system/activity-log` | `reportService.activityLog()` | Working |
| 55 | System | Alert History | `/reports/system/alert-history` | `reportService.alertHistory()` | Working |

### 2.2 Backend Report Endpoints (8)

| # | Endpoint | Controller | Status |
|---|----------|------------|--------|
| 1 | `GET /api/v1/reports/trial-balance` | `AccountController@trialBalance` | Working |
| 2 | `GET /api/v1/reports/profit-loss` | `AccountController@profitLoss` | Working |
| 3 | `GET /api/v1/reports/cash-flow` | `AccountController@cashFlow` | Working |
| 4 | `GET /api/v1/reports/balance-sheet` | `AccountController@balanceSheet` | Working |
| 5 | `GET /api/v1/reports/receivables` | `AccountController@receivables` | Working (AR Aging) |
| 6 | `GET /api/v1/reports/payables` | `AccountController@payables` | Working (AP Aging) |
| 7 | `GET /api/v1/accounts/{id}/ledger` | `AccountController@ledger` | Working |
| 8 | `GET /api/v1/customers/{id}/statement` | `CustomerController@statement` | Working |

### 2.3 Dashboard Analytics (existing but not "reports")

The `dashboardService.ts` already fetches: summary KPIs, sales trends, top products, payment methods, stock movements, purchase vs sales, inventory by category, warehouse stock, customer distribution, POS sessions, low stock items, alerts, activity feed, plus super admin analytics.

### 2.4 What is Missing (Still to Build)

| Category | Missing Reports | Status |
|----------|----------------|--------|
| Inventory | (all 10 reports built) | ✅ Complete |
| Sales | (all 7 reports built) | ✅ Complete |
| Purchase | (all 5 reports built) | ✅ Complete |
| POS | (all 6 reports built) | ✅ Complete |
| Accounting | Tax return (VAT/SD), budget vs actual, cash flow forecast, bank reconciliation, fiscal period close | 🔲 UI needed for 5 |
| Customer | (all 3 reports built) | ✅ Complete |
| Supplier | (all 3 reports built) | ✅ Complete |
| Product | (all 3 reports built) | ✅ Complete |
| Warehouse | (all 3 reports built) | ✅ Complete |
| Tax | VAT return detail, SD return detail | 🔲 Advanced breakdown |
| Manufacturing | BOM cost, production output, WIP, scrap/yield | 🔲 Needs backend |
| HR | User activity, login history, salesperson commission | 🔲 Needs backend |
| System | (all 3 reports built) | ✅ Complete |
| Business-type | Pharmacy, Restaurant, Fashion, Electronics, Grocery-specific | 🔲 Needs backend |

---

## 3. Report Infrastructure Architecture

### 3.1 Backend Architecture

```
inventory-api/
├── app/
│   ├── Http/Controllers/Api/
│   │   └── ReportController.php          ← NEW: consolidated report controller
│   ├── Services/
│   │   ├── ReportService.php              ← NEW: report generation service
│   │   └── ExportService.php              ← NEW: PDF/Excel/CSV export
│   ├── Reports/                           ← NEW: report class per category
│   │   ├── Inventory/
│   │   │   ├── StockValuationReport.php
│   │   │   ├── StockAgingReport.php
│   │   │   ├── AbcAnalysisReport.php
│   │   │   └── ...
│   │   ├── Sales/
│   │   ├── Purchase/
│   │   ├── Pos/
│   │   ├── Accounting/
│   │   └── ...
│   └── Exports/                           ← NEW: Laravel Excel export classes
│       ├── StockValuationExport.php
│       └── ...
├── routes/
│   └── api/
│       └── reports.php                    ← NEW: consolidated report routes
```

### 3.2 Frontend Architecture (Current State)

```
inventory-ui/
├── app/(protected)/reports/
│   ├── layout.tsx                         ← EXISTS: shared report layout (filters, export bar)
│   ├── inventory/                         ← EXISTS: inventory report category (10 reports)
│   │   ├── stock-valuation/page.tsx
│   │   ├── stock-aging/page.tsx
│   │   ├── abc-analysis/page.tsx
│   │   ├── dead-stock/page.tsx
│   │   ├── reorder/page.tsx
│   │   ├── low-stock/page.tsx
│   │   ├── stock-movement/page.tsx
│   │   ├── stock-adjustment/page.tsx
│   │   ├── batch-expiry/page.tsx
│   │   ├── shrinkage/page.tsx
│   │   └── turnover/page.tsx
│   ├── sales/                             ← EXISTS: sales report category (7 reports)
│   │   ├── by-product/page.tsx
│   │   ├── by-customer/page.tsx
│   │   ├── by-category/page.tsx
│   │   ├── salesperson-performance/page.tsx
│   │   ├── profit-margin/page.tsx
│   │   ├── return-analysis/page.tsx
│   │   └── sales-trend/page.tsx
│   ├── purchase/                          ← EXISTS: purchase report category (5 reports)
│   │   ├── po-summary/page.tsx
│   │   ├── supplier-performance/page.tsx
│   │   ├── by-supplier/page.tsx
│   │   ├── grn-register/page.tsx
│   │   └── purchase-return/page.tsx
│   ├── pos/                               ← EXISTS: POS report category (6 reports)
│   │   ├── daily-sales/page.tsx
│   │   ├── session-summary/page.tsx
│   │   ├── cashier-performance/page.tsx
│   │   ├── hourly-sales/page.tsx
│   │   ├── payment-breakdown/page.tsx
│   │   └── refund-summary/page.tsx
│   ├── accounting/                        ← EXISTS: accounting report category (3 reports)
│   │   ├── ar-aging/page.tsx              ← UI built
│   │   ├── ap-aging/page.tsx              ← UI built
│   │   ├── tax-return/page.tsx            ← TODO
│   │   ├── budget-vs-actual/page.tsx      ← TODO
│   │   ├── cash-flow-forecast/page.tsx    ← TODO
│   │   └── failed-journal/page.tsx        ← UI built
│   ├── customer/                          ← EXISTS: customer report category (3 reports)
│   │   ├── statement/page.tsx
│   │   ├── aging/page.tsx
│   │   └── profitability/page.tsx
│   ├── supplier/                          ← EXISTS: supplier report category (3 reports)
│   │   ├── statement/page.tsx
│   │   ├── aging/page.tsx
│   │   └── scorecard/page.tsx
│   ├── product/                           ← EXISTS: product report category (3 reports)
│   │   ├── profitability/page.tsx
│   │   ├── price-list/page.tsx
│   │   └── stock-status/page.tsx
│   ├── warehouse/                         ← EXISTS: warehouse report category (3 reports)
│   │   ├── stock-summary/page.tsx
│   │   ├── bin-utilization/page.tsx
│   │   └── transfer/page.tsx
│   ├── tax/                               ← EXISTS: tax report category (2 reports)
│   │   ├── return/page.tsx
│   │   └── summary/page.tsx
│   ├── system/                            ← EXISTS: system report category (3 reports)
│   │   ├── audit-log/page.tsx
│   │   ├── activity-log/page.tsx
│   │   └── alert-history/page.tsx
│   ├── trial-balance/page.tsx             ← EXISTS
│   ├── profit-loss/page.tsx               ← EXISTS
│   ├── cash-flow/page.tsx                 ← EXISTS
│   ├── balance-sheet/page.tsx             ← EXISTS
│   ├── ledger/page.tsx                    ← EXISTS
│   └── purchase-list/page.tsx             ← EXISTS
├── components/reports/                    ← EXISTS: shared report components
│   ├── ReportLayout.tsx                   ← shared header + filter bar + export bar
│   ├── ReportFilters.tsx                  ← date range, warehouse, category, etc.
│   ├── ReportTable.tsx                    ← sortable, paginated report table
│   ├── ReportSummaryCards.tsx             ← KPI cards above the table
│   ├── ReportChart.tsx                    ← chart wrapper for visual reports
│   ├── ReportExportBar.tsx                ← PDF / Excel / CSV / Print buttons
│   └── ReportEmptyState.tsx               ← no data state
├── components/ui/
│   └── tenant-select.tsx                  ← EXISTS: multi-tenant selection dropdown
├── services/
│   ├── reportService.ts                   ← EXISTS: 45 report methods + tenant_id support
│   └── accountService.ts                  ← EXISTS: 6 financial report methods + tenant_id support
├── hooks/
│   ├── use-report.ts                      ← EXISTS: SWR-based report data fetching
│   ├── use-permissions.ts                 ← EXISTS: permission checking + isSuperAdmin
│   └── use-auth.ts                        ← EXISTS: session refresh via SWR
├── stores/
│   ├── auth-store.ts                      ← EXISTS: user state including tenant_id
│   └── tenant-store.ts                    ← EXISTS: selected tenant for filtering
└── lib/
    └── utils/
        ├── export.ts                      ← EXISTS: client-side CSV/Excel export helpers
        └── format.ts                      ← EXISTS: currency, date, number formatting
```

### 3.3 Report Route Convention

All new report endpoints will follow a consistent pattern:

```
GET  /api/v1/reports/{category}/{name}?params...
GET  /api/v1/reports/{category}/{name}/export?format=pdf|excel|csv&params...
```

Examples:
```
GET  /api/v1/reports/inventory/stock-valuation?warehouse_id=1&as_of_date=2026-07-08&costing_method=weighted_avg
GET  /api/v1/reports/inventory/stock-valuation/export?format=excel&warehouse_id=1&as_of_date=2026-07-08
GET  /api/v1/reports/sales/by-product?start_date=2026-07-01&end_date=2026-07-08&category_id=5
GET  /api/v1/reports/pos/daily-sales?date=2026-07-08&register_id=2
```

---

## 4. Report Categories by Module

### 4.1 Inventory & Stock Reports

#### 4.1.1 Stock Valuation Report

| Field | Value |
|-------|-------|
| **Purpose** | Calculate total inventory value using FIFO, LIFO, Weighted Average, or Standard Cost |
| **Business value** | Financial reporting, insurance, audit, tax basis |
| **Data source** | `stocks` JOIN `product_variations` (cost_price) JOIN `products` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/stock-valuation` |
| **Frontend page** | `/reports/inventory/stock-valuation` |
| **Filters** | `warehouse_id`, `as_of_date`, `costing_method` (fifo/lifo/weighted_avg/standard), `category_id`, `brand_id` |
| **Columns** | Product, Variation, SKU, Warehouse, Quantity On Hand, Unit Cost, Total Value, Reserved Qty, Available Qty |
| **Summary** | Total SKU count, Total quantity, Total value, Average cost |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-stock-valuation-report` |
| **Priority** | P0 — Critical |

#### 4.1.2 Stock Aging Report

| Field | Value |
|-------|-------|
| **Purpose** | Show how long stock has been sitting (0-30, 31-60, 61-90, 90+ days) |
| **Business value** | Identify slow-moving and obsolete inventory, plan markdowns |
| **Data source** | `stock_movements` (last inbound per stock row) JOIN `stocks` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/stock-aging` |
| **Frontend page** | `/reports/inventory/stock-aging` |
| **Filters** | `warehouse_id`, `category_id`, `aging_buckets` (configurable) |
| **Columns** | Product, Variation, SKU, Warehouse, Quantity, Last Received Date, Age Days, Bucket (0-30/31-60/61-90/90+), Value |
| **Summary** | Total value per bucket, count per bucket |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-stock-aging-report` |
| **Priority** | P1 — High |
| **Note** | `stock_aging` table exists in DB but no model/controller/UI |

#### 4.1.3 ABC Analysis Report

| Field | Value |
|-------|-------|
| **Purpose** | Pareto analysis — classify products as A (top 80% value), B (next 15%), C (bottom 5%) |
| **Business value** | Inventory prioritization, cycle count frequency, purchasing focus |
| **Data source** | `pos_order_items` + `sales_order_items` (revenue) JOIN `products` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/abc-analysis` |
| **Frontend page** | `/reports/inventory/abc-analysis` |
| **Filters** | `start_date`, `end_date`, `metric` (revenue/quantity/profit), `category_id` |
| **Columns** | Rank, Product, Variation, SKU, Revenue/Qty, Cumulative %, Class (A/B/C) |
| **Summary** | A-class count & value, B-class count & value, C-class count & value |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-abc-analysis-report` |
| **Priority** | P1 — High |
| **Note** | `abc_categories` table exists in DB but no model/controller/UI |

#### 4.1.4 Dead Stock Report

| Field | Value |
|-------|-------|
| **Purpose** | Products with zero sales movement in N days |
| **Business value** | Capital tied up, clearance planning, write-off decisions |
| **Data source** | `stocks` LEFT JOIN `stock_movements` (WHERE type=sales AND created_at > threshold) |
| **Backend endpoint** | `GET /api/v1/reports/inventory/dead-stock` |
| **Frontend page** | `/reports/inventory/dead-stock` |
| **Filters** | `warehouse_id`, `days_threshold` (default 90), `category_id`, `min_value` |
| **Columns** | Product, Variation, SKU, Warehouse, Quantity, Unit Cost, Total Value, Last Sale Date, Days Since Last Sale |
| **Summary** | Total dead stock value, count of dead SKUs |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-dead-stock-report` |
| **Priority** | P1 — High |

#### 4.1.5 Reorder / Low Stock Report

| Field | Value |
|-------|-------|
| **Purpose** | Items at or below reorder point, requiring purchase |
| **Business value** | Prevent stockouts, automate purchase requisitions |
| **Data source** | `stocks` WHERE `quantity <= reorder_point` (or `low_stock_threshold`) |
| **Backend endpoint** | `GET /api/v1/reports/inventory/reorder` |
| **Frontend page** | `/reports/inventory/reorder` |
| **Filters** | `warehouse_id`, `category_id`, `severity` (critical/low/all) |
| **Columns** | Product, Variation, SKU, Warehouse, Current Qty, Reorder Point, Reorder Qty (suggested), Last Received, Supplier |
| **Summary** | Critical count, low count, total suggested purchase value |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-reorder-report` |
| **Priority** | P0 — Critical |
| **Note** | `dashboardService.getLowStockItems()` exists but is dashboard-only |

#### 4.1.6 Low Stock Alert Report

| Field | Value |
|-------|-------|
| **Purpose** | Quick list of items below `low_stock_threshold` |
| **Business value** | Operational alert for warehouse staff |
| **Data source** | `stocks` WHERE `quantity <= low_stock_threshold` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/low-stock` |
| **Frontend page** | `/reports/inventory/low-stock` |
| **Filters** | `warehouse_id` |
| **Columns** | Product, Variation, SKU, Warehouse, Current Qty, Threshold, Available Qty |
| **Export** | CSV, Print |
| **Permission** | `view-low-stock-report` |
| **Priority** | P0 — Critical |

#### 4.1.7 Stock Movement Ledger Report

| Field | Value |
|-------|-------|
| **Purpose** | Complete audit trail of all stock changes in a date range |
| **Business value** | Audit, reconciliation, discrepancy investigation |
| **Data source** | `stock_movements` JOIN `products` JOIN `product_variations` JOIN `warehouses` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/stock-movement` |
| **Frontend page** | `/reports/inventory/stock-movement` |
| **Filters** | `warehouse_id`, `product_id`, `variation_id`, `movement_type`, `start_date`, `end_date`, `reference_type` |
| **Columns** | Date, Product, Variation, SKU, Warehouse, Movement Type, Reference (PO/SO/POS #), Qty Before, Qty Change, Qty After, Unit Cost, Reason, Created By |
| **Summary** | Total in, total out, net change |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-stock-movement-report` |
| **Priority** | P0 — Critical |
| **Note** | `stock/movement` page exists but is a basic list, not a report with summary/export |

#### 4.1.8 Stock Adjustment Report

| Field | Value |
|-------|-------|
| **Purpose** | Summary of all manual adjustments, damages, and write-offs |
| **Business value** | Track shrinkage, identify patterns of loss |
| **Data source** | `stock_movements` WHERE `movement_type IN (adjustment, damage, expiry)` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/stock-adjustment` |
| **Frontend page** | `/reports/inventory/stock-adjustment` |
| **Filters** | `warehouse_id`, `adjustment_type`, `start_date`, `end_date` |
| **Columns** | Date, Product, Variation, SKU, Warehouse, Type (Adjustment/Damage/Expiry), Qty Change, Value, Reason, Approved By |
| **Summary** | Total adjustment value, total damage value, total expiry value |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-stock-adjustment-report` |
| **Priority** | P1 — High |

#### 4.1.9 Batch & Expiry Report

| Field | Value |
|-------|-------|
| **Purpose** | All batches with expiry dates, grouped by urgency |
| **Business value** | FEFO enforcement, pharmacy compliance, waste prevention |
| **Data source** | `batches` JOIN `products` JOIN `product_variations` JOIN `warehouses` |
| **Backend endpoint** | `GET /api/v1/reports/inventory/batch-expiry` |
| **Frontend page** | `/reports/inventory/batch-expiry` |
| **Filters** | `warehouse_id`, `urgency` (expired/7days/30days/60days/all), `product_id` |
| **Columns** | Product, Variation, Batch Number, Warehouse, Mfg Date, Expiry Date, Days to Expiry, Current Qty, Status, Value at Risk |
| **Summary** | Expired count & value, expiring in 7 days, expiring in 30 days |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-batch-expiry-report` |
| **Priority** | P0 — Critical (especially for pharmacy) |

#### 4.1.10 Inventory Shrinkage Report

| Field | Value |
|-------|-------|
| **Purpose** | Compare system stock vs physical count, show variance |
| **Business value** | Loss prevention, stock accuracy, audit |
| **Data source** | `stocks` (system) vs stocktake results + `stock_movements` (adjustment/damage/expiry) |
| **Backend endpoint** | `GET /api/v1/reports/inventory/shrinkage` |
| **Frontend page** | `/reports/inventory/shrinkage` |
| **Filters** | `warehouse_id`, `start_date`, `end_date`, `category_id` |
| **Columns** | Product, Variation, Warehouse, System Qty, Counted Qty, Variance, Variance Value, Variance %, Reason |
| **Summary** | Total shrinkage value, shrinkage %, count of items with variance |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-shrinkage-report` |
| **Priority** | P2 — Medium (depends on stocktake feature) |

#### 4.1.11 Inventory Turnover Report

| Field | Value |
|-------|-------|
| **Purpose** | Calculate turnover ratio and days-of-inventory per product/category |
| **Business value** | Efficiency metric, identify overstock/understock |
| **Data source** | `stock_movements` (sales) + `stocks` (average inventory) |
| **Backend endpoint** | `GET /api/v1/reports/inventory/turnover` |
| **Frontend page** | `/reports/inventory/turnover` |
| **Filters** | `start_date`, `end_date`, `warehouse_id`, `category_id`, `group_by` (product/category/brand) |
| **Columns** | Product/Category, COGS, Avg Inventory, Turnover Ratio, Days in Inventory, GMROI |
| **Summary** | Overall turnover, avg days in inventory, total GMROI |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-turnover-report` |
| **Priority** | P2 — Medium |

---

### 4.2 Sales Reports

#### 4.2.1 Sales by Product Report

| Field | Value |
|-------|-------|
| **Purpose** | Revenue and quantity sold per product/variation in a date range |
| **Business value** | Product performance, inventory planning, purchasing decisions |
| **Data source** | `pos_order_items` + `sales_order_items` JOIN `products` JOIN `product_variations` |
| **Backend endpoint** | `GET /api/v1/reports/sales/by-product` |
| **Frontend page** | `/reports/sales/by-product` |
| **Filters** | `start_date`, `end_date`, `warehouse_id`, `category_id`, `brand_id`, `source` (pos/so/all), `sort_by` (revenue/quantity/profit) |
| **Columns** | Product, Variation, SKU, Category, Units Sold, Gross Revenue, Discount, Net Revenue, COGS, Gross Profit, Margin % |
| **Summary** | Total revenue, total COGS, total gross profit, avg margin |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-sales-by-product-report` |
| **Priority** | P0 — Critical |

#### 4.2.2 Sales by Customer Report

| Field | Value |
|-------|-------|
| **Purpose** | Revenue per customer, identify top customers, track buying patterns |
| **Business value** | Customer relationship management, targeted marketing, credit control |
| **Data source** | `sales_orders` + `pos_orders` JOIN `customers` |
| **Backend endpoint** | `GET /api/v1/reports/sales/by-customer` |
| **Frontend page** | `/reports/sales/by-customer` |
| **Filters** | `start_date`, `end_date`, `customer_type` (retail/wholesale/corporate/dealer), `source` |
| **Columns** | Customer, Type, Phone, Order Count, Total Revenue, Total Paid, Outstanding, Avg Order Value, Last Purchase |
| **Summary** | Total revenue, total outstanding, customer count, avg revenue per customer |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-sales-by-customer-report` |
| **Priority** | P0 — Critical |

#### 4.2.3 Sales by Category Report

| Field | Value |
|-------|-------|
| **Purpose** | Revenue breakdown by product category |
| **Business value** | Category management, assortment planning |
| **Data source** | `pos_order_items` + `sales_order_items` JOIN `products` JOIN `categories` |
| **Backend endpoint** | `GET /api/v1/reports/sales/by-category` |
| **Frontend page** | `/reports/sales/by-category` |
| **Filters** | `start_date`, `end_date`, `warehouse_id`, `source` |
| **Columns** | Category, Product Count, Units Sold, Revenue, COGS, Gross Profit, Margin %, Revenue Share % |
| **Summary** | Total revenue, total profit, revenue distribution |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-sales-by-category-report` |
| **Priority** | P1 — High |

#### 4.2.4 Salesperson Performance Report

| Field | Value |
|-------|-------|
| **Purpose** | Track sales by salesperson, compute commission |
| **Business value** | Performance evaluation, incentive calculation |
| **Data source** | `sales_orders` (by `created_by` or `salesperson_id`) JOIN `users` |
| **Backend endpoint** | `GET /api/v1/reports/sales/salesperson-performance` |
| **Frontend page** | `/reports/sales/salesperson-performance` |
| **Filters** | `start_date`, `end_date`, `user_id` |
| **Columns** | Salesperson, Orders Count, Total Revenue, Total Collected, Outstanding, Commission Rate, Commission Earned, Avg Order Value |
| **Summary** | Total commission, top performer, total revenue |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-salesperson-performance-report` |
| **Priority** | P2 — Medium (depends on salesperson/commission feature) |

#### 4.2.5 Profit Margin Report

| Field | Value |
|-------|-------|
| **Purpose** | Gross profit margin per product, category, or overall |
| **Business value** | Pricing strategy, identify loss-making products |
| **Data source** | `pos_order_items` + `sales_order_items` (selling_price vs cost_price) |
| **Backend endpoint** | `GET /api/v1/reports/sales/profit-margin` |
| **Frontend page** | `/reports/sales/profit-margin` |
| **Filters** | `start_date`, `end_date`, `group_by` (product/category/brand/customer), `min_margin`, `max_margin` |
| **Columns** | Group, Revenue, COGS, Gross Profit, Margin %, Units Sold, Compare to Previous Period |
| **Summary** | Total gross profit, avg margin, items below target margin |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-profit-margin-report` |
| **Priority** | P1 — High |

#### 4.2.6 Sales Return Analysis Report

| Field | Value |
|-------|-------|
| **Purpose** | Analyze return rates by product, reason, and customer |
| **Business value** | Quality control, customer satisfaction, reduce future returns |
| **Data source** | `sales_returns` + `sales_return_items` + `pos_refunds` + `pos_refund_items` |
| **Backend endpoint** | `GET /api/v1/reports/sales/return-analysis` |
| **Frontend page** | `/reports/sales/return-analysis` |
| **Filters** | `start_date`, `end_date`, `reason`, `source` (sales_return/pos_refund/all) |
| **Columns** | Product, Variation, Units Sold, Units Returned, Return Rate %, Refund Amount, Top Reason |
| **Summary** | Total returns, avg return rate, total refund amount |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-return-analysis-report` |
| **Priority** | P1 — High |

#### 4.2.7 Sales Trend / Daily Sales Report

| Field | Value |
|-------|-------|
| **Purpose** | Day-by-day revenue trend (POS + Sales Orders) |
| **Business value** | Forecasting, seasonality detection, daily target tracking |
| **Data source** | `pos_orders` + `sales_orders` grouped by date |
| **Backend endpoint** | `GET /api/v1/reports/sales/trend` |
| **Frontend page** | `/reports/sales/sales-trend` |
| **Filters** | `start_date`, `end_date`, `period` (daily/weekly/monthly), `warehouse_id` |
| **Columns** | Date, POS Revenue, SO Revenue, Total Revenue, Order Count, Avg Order Value |
| **Chart** | Line/Area chart showing revenue over time |
| **Summary** | Total revenue, avg daily revenue, peak day, growth % |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-sales-trend-report` |
| **Priority** | P0 — Critical |
| **Note** | `dashboardService.getSalesTrend()` exists but is dashboard-only |

---

### 4.3 Purchase / Procurement Reports

#### 4.3.1 Purchase Order Summary Report

| Field | Value |
|-------|-------|
| **Purpose** | Overview of all POs by status, supplier, date range |
| **Business value** | Procurement tracking, spend analysis |
| **Data source** | `purchase_orders` JOIN `suppliers` JOIN `warehouses` |
| **Backend endpoint** | `GET /api/v1/reports/purchase/po-summary` |
| **Frontend page** | `/reports/purchase/po-summary` |
| **Filters** | `start_date`, `end_date`, `supplier_id`, `warehouse_id`, `status`, `payment_status` |
| **Columns** | PO Number, Supplier, Warehouse, Order Date, Expected Delivery, Status, Subtotal, Tax, Total, Paid, Due, Payment Status |
| **Summary** | Total PO value, total paid, total due, count by status |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-po-summary-report` |
| **Priority** | P0 — Critical |

#### 4.3.2 Supplier Performance Report

| Field | Value |
|-------|-------|
| **Purpose** | On-time delivery rate, quality, price variance per supplier |
| **Business value** | Supplier evaluation, negotiation leverage |
| **Data source** | `purchase_orders` (expected vs actual delivery) + `purchase_returns` |
| **Backend endpoint** | `GET /api/v1/reports/purchase/supplier-performance` |
| **Frontend page** | `/reports/purchase/supplier-performance` |
| **Filters** | `start_date`, `end_date`, `supplier_id` |
| **Columns** | Supplier, Total POs, On-Time Delivery %, Avg Lead Time (days), Total Purchase Value, Return Rate %, Quality Score |
| **Summary** | Best/worst supplier, avg on-time rate, avg lead time |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-supplier-performance-report` |
| **Priority** | P2 — Medium |

#### 4.3.3 Purchase by Supplier Report

| Field | Value |
|-------|-------|
| **Purpose** | Total spend per supplier in a date range |
| **Business value** | Spend analysis, supplier consolidation |
| **Data source** | `purchase_orders` + `purchase_order_items` JOIN `suppliers` |
| **Backend endpoint** | `GET /api/v1/reports/purchase/by-supplier` |
| **Frontend page** | `/reports/purchase/by-supplier` |
| **Filters** | `start_date`, `end_date`, `category_id` |
| **Columns** | Supplier, PO Count, Total Items, Total Quantity, Total Value, Total Paid, Total Due |
| **Summary** | Total spend, top supplier, spend distribution |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-purchase-by-supplier-report` |
| **Priority** | P1 — High |

#### 4.3.4 GRN Register Report

| Field | Value |
|-------|-------|
| **Purpose** | Goods Received Notes — all stock receipts in a date range |
| **Business value** | Receiving audit, supplier delivery tracking |
| **Data source** | `stock_movements` WHERE `movement_type = purchase` JOIN `purchase_orders` |
| **Backend endpoint** | `GET /api/v1/reports/purchase/grn-register` |
| **Frontend page** | `/reports/purchase/grn-register` |
| **Filters** | `start_date`, `end_date`, `supplier_id`, `warehouse_id` |
| **Columns** | GRN Date, PO Number, Supplier, Warehouse, Product, Variation, Qty Received, Unit Cost, Total Cost, Received By |
| **Summary** | Total receipts, total value |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-grn-report` |
| **Priority** | P1 — High |

#### 4.3.5 Purchase Return Report

| Field | Value |
|-------|-------|
| **Purpose** | Summary of goods returned to suppliers |
| **Business value** | Track defective shipments, supplier disputes |
| **Data source** | `purchase_returns` + `purchase_return_items` JOIN `suppliers` |
| **Backend endpoint** | `GET /api/v1/reports/purchase/purchase-return` |
| **Frontend page** | `/reports/purchase/purchase-return` |
| **Filters** | `start_date`, `end_date`, `supplier_id`, `status` |
| **Columns** | Return Number, PO Number, Supplier, Date, Status, Items, Total Value, Reason |
| **Summary** | Total returns, total value, return rate |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-purchase-return-report` |
| **Priority** | P2 — Medium |

---

### 4.4 POS Reports

#### 4.4.1 POS Daily Sales Report

| Field | Value |
|-------|-------|
| **Purpose** | Complete daily sales summary per register/session |
| **Business value** | Daily reconciliation, cash management |
| **Data source** | `pos_orders` + `pos_sessions` + `payments` |
| **Backend endpoint** | `GET /api/v1/reports/pos/daily-sales` |
| **Frontend page** | `/reports/pos/daily-sales` |
| **Filters** | `date`, `register_id`, `session_id`, `cashier_id` |
| **Columns** | Order Number, Time, Customer, Items, Subtotal, Discount, Tax, Grand Total, Payment Method, Payment Status, Cashier |
| **Summary** | Total sales, total discount, total tax, count by payment method, net cash |
| **Export** | PDF, Excel, CSV, Print |
| **Permission** | `view-pos-daily-sales-report` |
| **Priority** | P0 — Critical |

#### 4.4.2 POS Session Summary / Z-Report

| Field | Value |
|-------|-------|
| **Purpose** | End-of-shift reconciliation report (Z-report) |
| **Business value** | Cash drawer reconciliation, theft detection |
| **Data source** | `pos_sessions` + `pos_orders` + `payments` |
| **Backend endpoint** | `GET /api/v1/reports/pos/session-summary` |
| **Frontend page** | `/reports/pos/session-summary` |
| **Filters** | `session_id`, `date` |
| **Columns** | Session Info (Register, Cashier, Start/End), Opening Balance, Cash Sales, Card Sales, bKash, Nagad, Rocket, Bank Transfer, Credit, Total Sales, Refunds, Cash In/Out, Expected Cash, Actual Cash, Variance |
| **Summary** | Expected vs actual cash, variance flag |
| **Export** | PDF, Print |
| **Permission** | `view-pos-session-report` |
| **Priority** | P0 — Critical |

#### 4.4.3 Cashier Performance Report

| Field | Value |
|-------|-------|
| **Purpose** | Sales and error metrics per cashier |
| **Business value** | Staff performance, training needs |
| **Data source** | `pos_orders` (by `created_by`) JOIN `users` |
| **Backend endpoint** | `GET /api/v1/reports/pos/cashier-performance` |
| **Frontend page** | `/reports/pos/cashier-performance` |
| **Filters** | `start_date`, `end_date`, `cashier_id` |
| **Columns** | Cashier, Register, Sessions, Sale Count, Total Sales, Refund Count, Refund Amount, Avg Sale, Cash Variance, Items per Sale |
| **Summary** | Top performer, total sales, avg variance |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-cashier-performance-report` |
| **Priority** | P1 — High |

#### 4.4.4 Hourly Sales Report

| Field | Value |
|-------|-------|
| **Purpose** | Sales volume by hour of day |
| **Business value** | Staff scheduling, peak hour identification |
| **Data source** | `pos_orders` grouped by HOUR(order_date) |
| **Backend endpoint** | `GET /api/v1/reports/pos/hourly-sales` |
| **Frontend page** | `/reports/pos/hourly-sales` |
| **Filters** | `date`, `date_range`, `register_id` |
| **Columns** | Hour (0-23), Order Count, Total Sales, Avg Order Value, Items Sold |
| **Chart** | Bar chart showing sales by hour |
| **Summary** | Peak hour, slowest hour, avg hourly sales |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-hourly-sales-report` |
| **Priority** | P2 — Medium |

#### 4.4.5 Payment Method Breakdown Report

| Field | Value |
|-------|-------|
| **Purpose** | Revenue split by payment method |
| **Business value** | Cash flow planning, payment method optimization |
| **Data source** | `payments` WHERE `pos_order_id IS NOT NULL` |
| **Backend endpoint** | `GET /api/v1/reports/pos/payment-breakdown` |
| **Frontend page** | `/reports/pos/payment-breakdown` |
| **Filters** | `start_date`, `end_date`, `register_id` |
| **Columns** | Payment Method, Transaction Count, Total Amount, Processing Fees, Net Amount, % of Total |
| **Chart** | Donut chart |
| **Summary** | Total collected, cash %, digital % |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-payment-breakdown-report` |
| **Priority** | P1 — High |
| **Note** | `dashboardService.getPaymentMethods()` exists but is dashboard-only |

#### 4.4.6 POS Refund Summary Report

| Field | Value |
|-------|-------|
| **Purpose** | All POS refunds with reason breakdown |
| **Business value** | Loss tracking, customer satisfaction monitoring |
| **Data source** | `pos_refunds` + `pos_refund_items` JOIN `pos_orders` |
| **Backend endpoint** | `GET /api/v1/reports/pos/refund-summary` |
| **Frontend page** | `/reports/pos/refund-summary` |
| **Filters** | `start_date`, `end_date`, `reason`, `refund_method`, `status` |
| **Columns** | Refund Number, Date, Original Order, Customer, Reason, Refund Method, Amount, Status, Approved By |
| **Summary** | Total refunds, refund rate, by reason breakdown |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-pos-refund-report` |
| **Priority** | P1 — High |

---

### 4.5 Accounting & Financial Reports

#### 4.5.1 AR Aging Report (Receivables)

| Field | Value |
|-------|-------|
| **Purpose** | Outstanding customer balances by age bucket |
| **Business value** | Collection priority, bad debt estimation |
| **Data source** | `sales_orders` + `customers` + journal AR account (1110) |
| **Backend endpoint** | `GET /api/v1/reports/receivables` (EXISTS) |
| **Frontend page** | `/reports/accounting/ar-aging` (MISSING) |
| **Filters** | `as_of_date` |
| **Columns** | Customer, Invoice #, Invoice Date, Due Date, Total, Paid, Outstanding, Current, 1-30, 31-60, 61-90, 90+ |
| **Summary** | Total outstanding, by bucket |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-ar-aging-report` |
| **Priority** | P0 — Critical (backend exists, UI missing) |

#### 4.5.2 AP Aging Report (Payables)

| Field | Value |
|-------|-------|
| **Purpose** | Outstanding supplier balances by age bucket |
| **Business value** | Payment scheduling, cash flow planning |
| **Data source** | `purchase_orders` + `suppliers` + journal AP account (2101) |
| **Backend endpoint** | `GET /api/v1/reports/payables` (EXISTS) |
| **Frontend page** | `/reports/accounting/ap-aging` (MISSING) |
| **Filters** | `as_of_date` |
| **Columns** | Supplier, PO #, Order Date, Due Date, Total, Paid, Outstanding, Current, 1-30, 31-60, 61-90, 90+ |
| **Summary** | Total payable, by bucket |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-ap-aging-report` |
| **Priority** | P0 — Critical (backend exists, UI missing) |

#### 4.5.3 Tax Return / VAT Report

| Field | Value |
|-------|-------|
| **Purpose** | VAT/SD liability calculation for tax filing period |
| **Business value** | Legal compliance, tax planning |
| **Data source** | `journal_entries` + `journal_entry_lines` (Output VAT 2110, Input VAT 1140, SD 2111) + `tax_entries` |
| **Backend endpoint** | `GET /api/v1/reports/accounting/tax-return` |
| **Frontend page** | `/reports/accounting/tax-return` |
| **Filters** | `start_date`, `end_date`, `tax_type` (vat/sd/combined) |
| **Columns** | Output VAT Collected, Input VAT Paid, Net VAT Payable, SD Collected, Total Tax Liability |
| **Summary** | Total tax due, breakdown by tax type |
| **Export** | PDF (tax filing format), Excel |
| **Permission** | `view-tax-return-report` |
| **Priority** | P1 — High |
| **Note** | `tax_rates` and `tax_entries` tables exist but no controller |

#### 4.5.4 Budget vs Actual Report

| Field | Value |
|-------|-------|
| **Purpose** | Compare budgeted vs actual revenue and expenses |
| **Business value** | Financial planning, variance analysis |
| **Data source** | `budgets` (NEW table) + `journal_entry_lines` |
| **Backend endpoint** | `GET /api/v1/reports/accounting/budget-vs-actual` |
| **Frontend page** | `/reports/accounting/budget-vs-actual` |
| **Filters** | `fiscal_period_id`, `account_type` |
| **Columns** | Account, Budgeted Amount, Actual Amount, Variance, Variance % |
| **Summary** | Total budget vs actual, overall variance |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-budget-report` |
| **Priority** | P3 — Low (depends on budget feature) |

#### 4.5.5 Cash Flow Forecast Report

| Field | Value |
|-------|-------|
| **Purpose** | Projected cash position based on AR/AP due dates |
| **Business value** | Liquidity planning, working capital management |
| **Data source** | `sales_orders` (due_date) + `purchase_orders` (expected_delivery) + `pos_sessions` |
| **Backend endpoint** | `GET /api/v1/reports/accounting/cash-flow-forecast` |
| **Frontend page** | `/reports/accounting/cash-flow-forecast` |
| **Filters** | `start_date`, `end_date`, `scenario` (optimistic/realistic/pessimistic) |
| **Columns** | Date, Expected Inflow (AR), Expected Outflow (AP), Net Flow, Running Cash Position |
| **Chart** | Line chart showing projected cash position |
| **Summary** | Projected end balance, min cash position, shortfall alerts |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-cash-flow-forecast-report` |
| **Priority** | P2 — Medium |

#### 4.5.6 Failed Journal Queue Report

| Field | Value |
|-------|-------|
| **Purpose** | List all auto-journal failures for admin retry |
| **Business value** | Bookkeeping integrity, audit compliance |
| **Data source** | `failed_journal_entries` |
| **Backend endpoint** | `GET /api/v1/admin/failed-journal-entries` (EXISTS) |
| **Frontend page** | `/reports/accounting/failed-journal` (MISSING) |
| **Filters** | `status` (unresolved/resolved/all), `reference_type` |
| **Columns** | Entry #, Date, Reference Type, Reference #, Error Message, Status, Resolved At, Resolved By |
| **Summary** | Unresolved count, error breakdown by type |
| **Export** | Excel, CSV |
| **Permission** | `view-failed-journal-report` |
| **Priority** | P0 — Critical (controller exists, UI missing) |

---

### 4.6 Customer Reports

#### 4.6.1 Customer Statement Report

| Field | Value |
|-------|-------|
| **Purpose** | Printable account statement per customer |
| **Business value** | Customer communication, dispute resolution, collections |
| **Data source** | `sales_orders` + `payments` + `sales_returns` per customer |
| **Backend endpoint** | `GET /api/v1/customers/{id}/statement` (EXISTS) |
| **Frontend page** | `/reports/customer/statement` |
| **Filters** | `customer_id`, `start_date`, `end_date` |
| **Columns** | Date, Document #, Type (Invoice/Payment/Return), Debit, Credit, Balance |
| **Summary** | Opening balance, closing balance, total invoiced, total paid |
| **Export** | PDF (letterhead format), Print |
| **Permission** | `view-customer-statement` |
| **Priority** | P0 — Critical (backend exists, needs print UI) |

#### 4.6.2 Customer Aging Report

| Field | Value |
|-------|-------|
| **Purpose** | All customers with outstanding balances by age |
| **Business value** | Collection management, credit control |
| **Data source** | `customers` + `sales_orders` (outstanding) |
| **Backend endpoint** | `GET /api/v1/reports/customer/aging` |
| **Frontend page** | `/reports/customer/aging` |
| **Filters** | `as_of_date`, `customer_type` |
| **Columns** | Customer, Phone, Total Outstanding, Current, 1-30, 31-60, 61-90, 90+, Credit Limit, Available Credit |
| **Summary** | Total outstanding, count of overdue customers |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-customer-aging-report` |
| **Priority** | P0 — Critical |

#### 4.6.3 Customer Profitability Report

| Field | Value |
|-------|-------|
| **Purpose** | Profit generated per customer |
| **Business value** | Customer segmentation, VIP identification |
| **Data source** | `sales_orders` + `pos_orders` JOIN customers + COGS |
| **Backend endpoint** | `GET /api/v1/reports/customer/profitability` |
| **Frontend page** | `/reports/customer/profitability` |
| **Filters** | `start_date`, `end_date`, `customer_type` |
| **Columns** | Customer, Revenue, COGS, Gross Profit, Margin %, Order Count, Returns, Net Profit |
| **Summary** | Top customer, avg margin, total profit |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-customer-profitability-report` |
| **Priority** | P2 — Medium |

---

### 4.7 Supplier Reports

#### 4.7.1 Supplier Statement Report

| Field | Value |
|-------|-------|
| **Purpose** | Printable account statement per supplier |
| **Business value** | Supplier reconciliation, dispute resolution |
| **Data source** | `purchase_orders` + `payments` + `purchase_returns` per supplier |
| **Backend endpoint** | `GET /api/v1/reports/supplier/statement` |
| **Frontend page** | `/reports/supplier/statement` |
| **Filters** | `supplier_id`, `start_date`, `end_date` |
| **Columns** | Date, Document #, Type (PO/Payment/Return), Debit, Credit, Balance |
| **Summary** | Opening balance, closing balance, total purchased, total paid |
| **Export** | PDF (letterhead format), Print |
| **Permission** | `view-supplier-statement` |
| **Priority** | P1 — High |

#### 4.7.2 Supplier Aging Report

| Field | Value |
|-------|-------|
| **Purpose** | All suppliers with outstanding payables by age |
| **Business value** | Payment scheduling, supplier relationship |
| **Data source** | `suppliers` + `purchase_orders` (outstanding) |
| **Backend endpoint** | `GET /api/v1/reports/supplier/aging` |
| **Frontend page** | `/reports/supplier/aging` |
| **Filters** | `as_of_date` |
| **Columns** | Supplier, Phone, Total Payable, Current, 1-30, 31-60, 61-90, 90+ |
| **Summary** | Total payable, count of overdue suppliers |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-supplier-aging-report` |
| **Priority** | P0 — Critical |

#### 4.7.3 Supplier Scorecard Report

| Field | Value |
|-------|-------|
| **Purpose** | Comprehensive supplier evaluation |
| **Business value** | Supplier selection, negotiation |
| **Data source** | `purchase_orders` + `purchase_returns` + delivery metrics |
| **Backend endpoint** | `GET /api/v1/reports/supplier/scorecard` |
| **Frontend page** | `/reports/supplier/scorecard` |
| **Filters** | `start_date`, `end_date`, `supplier_id` |
| **Columns** | Supplier, Total Spend, PO Count, On-Time %, Quality (Return Rate), Price Competitiveness, Lead Time, Overall Score |
| **Summary** | Best supplier, worst supplier, avg score |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-supplier-scorecard-report` |
| **Priority** | P2 — Medium |

---

### 4.8 Product / Catalog Reports

#### 4.8.1 Product Profitability Report

| Field | Value |
|-------|-------|
| **Purpose** | Margin per product/variation |
| **Business value** | Pricing optimization, product mix decisions |
| **Data source** | `product_variations` (cost_price vs selling_price) + sales data |
| **Backend endpoint** | `GET /api/v1/reports/product/profitability` |
| **Frontend page** | `/reports/product/profitability` |
| **Filters** | `category_id`, `brand_id`, `min_margin`, `max_margin` |
| **Columns** | Product, Variation, SKU, Cost Price, Selling Price, MRP, Margin, Margin %, Units Sold (period), Total Profit |
| **Summary** | Avg margin, products below cost, products with highest margin |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-product-profitability-report` |
| **Priority** | P1 — High |

#### 4.8.2 Product Price List Report

| Field | Value |
|-------|-------|
| **Purpose** | Printable price list for customers or sales team |
| **Business value** | Sales tool, catalog management |
| **Data source** | `products` + `product_variations` |
| **Backend endpoint** | `GET /api/v1/reports/product/price-list` |
| **Frontend page** | `/reports/product/price-list` |
| **Filters** | `category_id`, `brand_id`, `price_level` (selling/mrp/dp), `active_only` |
| **Columns** | Product, Variation, SKU, Unit, Cost Price, Selling Price, MRP, DP, Stock Status |
| **Export** | PDF, Excel, CSV, Print |
| **Permission** | `view-price-list-report` |
| **Priority** | P2 — Medium |

#### 4.8.3 Product Stock Status Report

| Field | Value |
|-------|-------|
| **Purpose** | Quick overview of all products with stock levels |
| **Business value** | Inventory snapshot, reorder planning |
| **Data source** | `products` + `product_variations` + `stocks` |
| **Backend endpoint** | `GET /api/v1/reports/product/stock-status` |
| **Frontend page** | `/reports/product/stock-status` |
| **Filters** | `warehouse_id`, `category_id`, `stock_status` (in_stock/low/out_of_stock/all) |
| **Columns** | Product, Variation, SKU, Warehouse, On Hand, Reserved, Available, Reorder Point, Status, Value |
| **Summary** | In-stock count, low-stock count, out-of-stock count, total value |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-stock-status-report` |
| **Priority** | P0 — Critical |

---

### 4.9 Warehouse & Logistics Reports

#### 4.9.1 Warehouse Stock Summary Report

| Field | Value |
|-------|-------|
| **Purpose** | Stock value and quantity per warehouse |
| **Business value** | Multi-warehouse management, distribution planning |
| **Data source** | `stocks` JOIN `warehouses` |
| **Backend endpoint** | `GET /api/v1/reports/warehouse/stock-summary` |
| **Frontend page** | `/reports/warehouse/stock-summary` |
| **Filters** | `warehouse_id`, `category_id` |
| **Columns** | Warehouse, Product Count, Total Quantity, Total Value, Low Stock Items, Out of Stock Items |
| **Summary** | Grand total across all warehouses |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-warehouse-stock-report` |
| **Priority** | P1 — High |

#### 4.9.2 Bin Utilization Report

| Field | Value |
|-------|-------|
| **Purpose** | Storage capacity utilization per bin |
| **Business value** | Warehouse optimization, space planning |
| **Data source** | `bins` + `stock_locations` |
| **Backend endpoint** | `GET /api/v1/reports/warehouse/bin-utilization` |
| **Frontend page** | `/reports/warehouse/bin-utilization` |
| **Filters** | `warehouse_id`, `bin_type`, `utilization_level` |
| **Columns** | Warehouse, Bin, Aisle/Rack/Shelf, Type, Capacity, Occupancy, Utilization %, Items |
| **Summary** | Avg utilization, over-utilized bins, under-utilized bins |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-bin-utilization-report` |
| **Priority** | P3 — Low |

#### 4.9.3 Stock Transfer Report

| Field | Value |
|-------|-------|
| **Purpose** | All inter-warehouse stock transfers |
| **Business value** | Distribution tracking, stock balancing |
| **Data source** | `stock_movements` WHERE `movement_type IN (transfer_out, transfer_in)` |
| **Backend endpoint** | `GET /api/v1/reports/warehouse/transfer` |
| **Frontend page** | `/reports/warehouse/transfer` |
| **Filters** | `start_date`, `end_date`, `from_warehouse_id`, `to_warehouse_id` |
| **Columns** | Date, Product, Variation, From Warehouse, To Warehouse, Quantity, Value, Transfer By |
| **Summary** | Total transfers, total quantity, total value |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-transfer-report` |
| **Priority** | P2 — Medium (depends on transfer feature) |

---

### 4.10 Tax & Compliance Reports

#### 4.10.1 VAT Return Report

| Field | Value |
|-------|-------|
| **Purpose** | VAT return filing (Output VAT vs Input VAT) |
| **Business value** | Legal compliance |
| **Data source** | `journal_entry_lines` (accounts 2110, 1140) + `tax_entries` |
| **Backend endpoint** | `GET /api/v1/reports/tax/vat-return` |
| **Frontend page** | `/reports/tax/vat-return` (or under accounting) |
| **Filters** | `start_date`, `end_date` (tax period) |
| **Columns** | Taxable Sales, Output VAT, Taxable Purchases, Input VAT, Net VAT Payable/(Refundable) |
| **Export** | PDF (government format), Excel |
| **Permission** | `view-vat-return-report` |
| **Priority** | P1 — High |

#### 4.10.2 Tax Summary Report

| Field | Value |
|-------|-------|
| **Purpose** | Tax collected and paid by period |
| **Business value** | Tax planning, compliance overview |
| **Data source** | `journal_entry_lines` (tax accounts) |
| **Backend endpoint** | `GET /api/v1/reports/tax/summary` |
| **Frontend page** | `/reports/tax/summary` |
| **Filters** | `start_date`, `end_date`, `tax_type` |
| **Columns** | Period, Output VAT, Input VAT, SD, Total Tax Collected, Total Tax Paid, Net Liability |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-tax-summary-report` |
| **Priority** | P2 — Medium |

---

### 4.11 Manufacturing / Assembly Reports

#### 4.11.1 BOM Cost Report

| Field | Value |
|-------|-------|
| **Purpose** | Cost breakdown of manufactured products |
| **Business value** | Pricing, cost control |
| **Data source** | `bill_of_materials` + `products` (component cost) |
| **Backend endpoint** | `GET /api/v1/reports/manufacturing/bom-cost` |
| **Frontend page** | `/reports/manufacturing/bom-cost` |
| **Filters** | `product_id` |
| **Columns** | Product, Component, Quantity, Unit Cost, Total Cost, Waste Factor, Adjusted Cost, Total BOM Cost |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-bom-cost-report` |
| **Priority** | P3 — Low (depends on manufacturing module) |

#### 4.11.2 Production Output Report

| Field | Value |
|-------|-------|
| **Purpose** | Assembly/manufacturing output summary |
| **Business value** | Production planning, efficiency tracking |
| **Data source** | `assembly_orders` + `stock_movements` (production/consumption) |
| **Backend endpoint** | `GET /api/v1/reports/manufacturing/production-output` |
| **Frontend page** | `/reports/manufacturing/production-output` |
| **Filters** | `start_date`, `end_date`, `product_id`, `warehouse_id` |
| **Columns** | Date, Product, Planned Qty, Produced Qty, Variance, Components Consumed, Cost, Yield % |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-production-report` |
| **Priority** | P3 — Low |

---

### 4.12 HR / User Reports

#### 4.12.1 User Activity Report

| Field | Value |
|-------|-------|
| **Purpose** | User login and action history |
| **Business value** | Security audit, productivity tracking |
| **Data source** | `activity_logs` + `users` |
| **Backend endpoint** | `GET /api/v1/reports/hr/user-activity` |
| **Frontend page** | `/reports/hr/user-activity` |
| **Filters** | `start_date`, `end_date`, `user_id`, `action_type` |
| **Columns** | User, Action, Module, Reference, Timestamp, IP Address |
| **Export** | Excel, CSV |
| **Permission** | `view-user-activity-report` |
| **Priority** | P2 — Medium |

#### 4.12.2 Salesperson Commission Report

| Field | Value |
|-------|-------|
| **Purpose** | Commission earned per salesperson |
| **Business value** | Payroll, incentive management |
| **Data source** | `sales_orders` (by salesperson) + commission rules |
| **Backend endpoint** | `GET /api/v1/reports/hr/commission` |
| **Frontend page** | `/reports/hr/commission` |
| **Filters** | `start_date`, `end_date`, `user_id` |
| **Columns** | Salesperson, Total Sales, Commission Rate, Commission Earned, Paid Commission, Pending Commission |
| **Export** | PDF, Excel, CSV |
| **Permission** | `view-commission-report` |
| **Priority** | P3 — Low (depends on commission feature) |

---

### 4.13 System / Admin Reports

#### 4.13.1 Audit Log Report

| Field | Value |
|-------|-------|
| **Purpose** | Complete change history for compliance |
| **Business value** | Compliance, forensic investigation |
| **Data source** | `audit_logs` |
| **Backend endpoint** | `GET /api/v1/reports/system/audit-log` |
| **Frontend page** | `/reports/system/audit-log` |
| **Filters** | `start_date`, `end_date`, `user_id`, `model_type`, `action` |
| **Columns** | Timestamp, User, Model, Action, Old Values, New Values, IP |
| **Export** | Excel, CSV |
| **Permission** | `view-audit-log-report` |
| **Priority** | P1 — High |
| **Note** | `audit_logs` table exists, no controller/UI |

#### 4.13.2 Activity Log Report

| Field | Value |
|-------|-------|
| **Purpose** | User activity feed (create/update/delete actions) |
| **Business value** | Operational tracking, productivity |
| **Data source** | `activity_logs` |
| **Backend endpoint** | `GET /api/v1/reports/system/activity-log` |
| **Frontend page** | `/reports/system/activity-log` |
| **Filters** | `start_date`, `end_date`, `user_id`, `subject_type` |
| **Columns** | Timestamp, User, Action, Subject Type, Subject ID, Description |
| **Export** | Excel, CSV |
| **Permission** | `view-activity-log-report` |
| **Priority** | P2 — Medium |

#### 4.13.3 Alert History Report

| Field | Value |
|-------|-------|
| **Purpose** | History of all system-generated alerts |
| **Business value** | Trend analysis, system health |
| **Data source** | `alerts` |
| **Backend endpoint** | `GET /api/v1/reports/system/alert-history` |
| **Frontend page** | `/reports/system/alert-history` |
| **Filters** | `start_date`, `end_date`, `alert_type`, `priority`, `status` |
| **Columns** | Date, Alert Type, Priority, Title, Message, Status, Resolved At |
| **Summary** | Alerts by type, by priority, resolution rate |
| **Export** | Excel, CSV |
| **Permission** | `view-alert-history-report` |
| **Priority** | P3 — Low |

---

### 4.14 Business-Type Specific Reports

#### 4.14.1 Pharmacy Reports (`business_type = pharmacy`)

| Report | Purpose | Priority |
|--------|---------|----------|
| **Prescription Fill Rate** | % of prescriptions filled vs total | P2 |
| **Controlled Substance Register** | Append-only log per Schedule-class | P1 |
| **Drug Interaction Alerts** | Log of interaction warnings triggered | P2 |
| **Expiring Medicines** | Batches expiring in 30/60/90 days | P0 (shared with batch-expiry) |
| **Top Prescribed Drugs** | Most dispensed medications | P2 |
| **Narcotic Dispensation Log** | Regulatory compliance | P1 |

#### 4.14.2 Restaurant / Cafe Reports (`business_type = restaurant|cafe`)

| Report | Purpose | Priority |
|--------|---------|----------|
| **Hourly Sales Heatmap** | Sales volume by hour x day | P2 |
| **Menu Item Performance** | Best/worst selling menu items | P1 |
| **Kitchen Waste Report** | Food waste by category | P2 |
| **Table Turnover Report** | Table utilization rate | P2 |
| **Recipe Cost Analysis** | Actual vs theoretical food cost | P2 |

#### 4.14.3 Fashion / Clothing Reports (`business_type = fashion|clothing|footwear`)

| Report | Purpose | Priority |
|--------|---------|----------|
| **Size-Color Sales Matrix** | Sales by variation attribute matrix | P1 |
| **Seasonal Trend** | Sales by season/collection | P2 |
| **Markdown Tracker** | Items sold below cost | P2 |
| **Slow Mover by Season** | Unsold seasonal inventory | P2 |

#### 4.14.4 Grocery / Supermarket Reports (`business_type = grocery|supermarket|departmental`)

| Report | Purpose | Priority |
|--------|---------|----------|
| **Shrinkage Report** | Loss by damage, expiry, theft | P1 |
| **Category Revenue Share** | Revenue distribution by category | P1 |
| **Fast Movers Report** | Top-selling items for restocking | P1 |
| **Promotion Effectiveness** | Sales lift during promotions | P3 |

---

## 5. Export & Print Capabilities

### 5.1 Export Formats

Every report should support at minimum:

| Format | When to Use | Implementation |
|--------|-------------|----------------|
| **PDF** | Official documents, customer-facing, print-ready | Backend: `barryvdh/laravel-dompdf` or `snappy/laravel-snappy` |
| **Excel (.xlsx)** | Data analysis, further manipulation | Backend: `maatwebsite/excel` (Laravel Excel) |
| **CSV** | Quick export, import to other tools | Backend: native PHP `fputcsv` or Laravel Excel |
| **Print** | Direct printing, receipt printing | Frontend: `window.print()` with print CSS |

### 5.2 Export Endpoint Pattern

```
GET /api/v1/reports/{category}/{name}/export?format=pdf&...filters...
GET /api/v1/reports/{category}/{name}/export?format=excel&...filters...
GET /api/v1/reports/{category}/{name}/export?format=csv&...filters...
```

Returns a file download response (`Content-Disposition: attachment`).

### 5.3 Client-Side Export (Quick)

For simple table exports without server round-trip:

```typescript
// lib/utils/export.ts
export function exportToCSV(data: Record<string, any>[], filename: string): void
export function exportToExcel(data: Record<string, any>[], filename: string, sheetName?: string): void
export function printReport(elementId: string, title: string): void
```

### 5.4 Server-Side Export (Full)

For complex reports with formatting, letterheads, and multi-page layouts:

```php
// app/Services/ExportService.php
class ExportService {
    public function toPdf(string $view, array $data, string $filename): Response
    public function toExcel(string $exportClass, array $data, string $filename): Response
    public function toCsv(array $data, string $filename): Response
}
```

### 5.5 Scheduled Reports (Future)

| Feature | Description |
|---------|-------------|
| **Email scheduling** | Daily/weekly/monthly report emailed to specified users |
| **Report templates** | Pre-configured filter combinations saved per user |
| **Dashboard widgets** | Key reports embedded as dashboard widgets |
| **Report subscriptions** | Users subscribe to recurring report delivery |

---

### 2.5 Tenant-Based Data Filtering

All report pages now implement tenant-based data filtering:

- **Super Admin**: Sees a `TenantSelect` dropdown in the filter bar, allowing selection of any tenant's data. When no tenant is selected, all tenants' data is shown (backend-dependent).
- **Tenant Admin / Tenant User**: The `TenantSelect` is hidden. Data is automatically scoped to the user's own tenant via `authUser.tenant_id` passed in API params.
- **Service Layer**: All methods in `reportService.ts` and `accountService.ts` accept an optional `tenant_id?: string` parameter that is forwarded to the backend.

---

## 6. Frontend Implementation Plan

> **Status Update (Jul 2026):** 45+ report pages across 10+ categories are already implemented. The implementation plan below documents the architecture pattern used. New report pages should follow the same pattern.

> **Tenant Filtering:** All 45+ existing pages implement tenant-based data filtering (see §2.5). New pages MUST include `TenantSelect` for super admins and forward `tenant_id` in API params.

### 6.1 Shared Report Components

#### ReportLayout Component

```typescript
// components/reports/ReportLayout.tsx
interface ReportLayoutProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  filters?: React.ReactNode;        // Filter controls
  summaryCards?: React.ReactNode;   // KPI cards
  actions?: React.ReactNode;        // Export buttons, etc.
  children: React.ReactNode;        // Table or chart
  loading?: boolean;
  error?: string;
  isEmpty?: boolean;
}
```

#### ReportFilters Component

```typescript
// components/reports/ReportFilters.tsx
interface ReportFiltersProps {
  onApply: (filters: Record<string, any>) => void;
  onReset: () => void;
  children: React.ReactNode;  // Custom filter controls
  defaultValues?: Record<string, any>;
}
```

Standard filter controls to build:
- DateRangePicker (start_date, end_date)
- WarehouseSelect (dropdown from warehouseService)
- CategorySelect (dropdown from categoryService)
- BrandSelect (dropdown from brandService)
- SupplierSelect (autocomplete from supplierService)
- CustomerSelect (autocomplete from customerService)
- StatusSelect (configurable enum)
- PeriodSelect (today/7d/30d/3m/12m/custom)

#### ReportExportBar Component

```typescript
// components/reports/ReportExportBar.tsx
interface ReportExportBarProps {
  exportEndpoint?: string;   // server-side export URL
  onExportPDF?: () => void;  // client-side
  onExportExcel?: () => void;
  onExportCSV?: () => void;
  onPrint?: () => void;
}
```

### 6.2 Report Service

```typescript
// services/reportService.ts
import apiClient from '@/lib/api/axios';

class ReportService {
  private base = '/api/v1/reports';

  // ── Inventory ──
  async stockValuation(params: StockValuationParams): Promise<StockValuationReport>
  async stockAging(params: StockAgingParams): Promise<StockAgingReport>
  async abcAnalysis(params: AbcAnalysisParams): Promise<AbcAnalysisReport>
  async deadStock(params: DeadStockParams): Promise<DeadStockReport>
  async reorderReport(params: ReorderParams): Promise<ReorderReport>
  async lowStockReport(params: LowStockParams): Promise<LowStockReport>
  async stockMovementReport(params: StockMovementParams): Promise<StockMovementReport>
  async stockAdjustmentReport(params: StockAdjustmentParams): Promise<StockAdjustmentReport>
  async batchExpiryReport(params: BatchExpiryParams): Promise<BatchExpiryReport>
  async shrinkageReport(params: ShrinkageParams): Promise<ShrinkageReport>
  async turnoverReport(params: TurnoverParams): Promise<TurnoverReport>

  // ── Sales ──
  async salesByProduct(params: SalesByProductParams): Promise<SalesByProductReport>
  async salesByCustomer(params: SalesByCustomerParams): Promise<SalesByCustomerReport>
  async salesByCategory(params: SalesByCategoryParams): Promise<SalesByCategoryReport>
  async salespersonPerformance(params: SalespersonParams): Promise<SalespersonReport>
  async profitMargin(params: ProfitMarginParams): Promise<ProfitMarginReport>
  async returnAnalysis(params: ReturnAnalysisParams): Promise<ReturnAnalysisReport>
  async salesTrend(params: SalesTrendParams): Promise<SalesTrendReport>

  // ── Purchase ──
  async poSummary(params: PoSummaryParams): Promise<PoSummaryReport>
  async supplierPerformance(params: SupplierPerformanceParams): Promise<SupplierPerformanceReport>
  async purchaseBySupplier(params: PurchaseBySupplierParams): Promise<PurchaseBySupplierReport>
  async grnRegister(params: GrnParams): Promise<GrnReport>
  async purchaseReturn(params: PurchaseReturnParams): Promise<PurchaseReturnReport>

  // ── POS ──
  async posDailySales(params: PosDailyParams): Promise<PosDailyReport>
  async posSessionSummary(params: PosSessionParams): Promise<PosSessionReport>
  async cashierPerformance(params: CashierParams): Promise<CashierReport>
  async hourlySales(params: HourlyParams): Promise<HourlyReport>
  async paymentBreakdown(params: PaymentBreakdownParams): Promise<PaymentBreakdownReport>
  async posRefundSummary(params: PosRefundParams): Promise<PosRefundReport>

  // ── Accounting ──
  async arAging(params: { as_of_date: string }): Promise<ARAgingReport>
  async apAging(params: { as_of_date: string }): Promise<APAgingReport>
  async taxReturn(params: TaxReturnParams): Promise<TaxReturnReport>
  async cashFlowForecast(params: CashFlowForecastParams): Promise<CashFlowForecastReport>
  async failedJournal(params: FailedJournalParams): Promise<FailedJournalReport>

  // ── Customer ──
  async customerStatement(params: CustomerStatementParams): Promise<CustomerStatementReport>
  async customerAging(params: CustomerAgingParams): Promise<CustomerAgingReport>
  async customerProfitability(params: CustomerProfitabilityParams): Promise<CustomerProfitabilityReport>

  // ── Supplier ──
  async supplierStatement(params: SupplierStatementParams): Promise<SupplierStatementReport>
  async supplierAging(params: SupplierAgingParams): Promise<SupplierAgingReport>
  async supplierScorecard(params: SupplierScorecardParams): Promise<SupplierScorecardReport>

  // ── Product ──
  async productProfitability(params: ProductProfitabilityParams): Promise<ProductProfitabilityReport>
  async priceList(params: PriceListParams): Promise<PriceListReport>
  async stockStatus(params: StockStatusParams): Promise<StockStatusReport>

  // ── Warehouse ──
  async warehouseStockSummary(params: WarehouseStockParams): Promise<WarehouseStockReport>
  async binUtilization(params: BinUtilizationParams): Promise<BinUtilizationReport>
  async stockTransfer(params: TransferParams): Promise<TransferReport>

  // ── System ──
  async auditLog(params: AuditLogParams): Promise<AuditLogReport>
  async activityLog(params: ActivityLogParams): Promise<ActivityLogReport>
  async alertHistory(params: AlertHistoryParams): Promise<AlertHistoryReport>

  // ── Export ──
  async exportReport(category: string, name: string, format: 'pdf'|'excel'|'csv', params: Record<string, any>): Promise<Blob> {
    const response = await apiClient.get(`${this.base}/${category}/${name}/export`, {
      params: { format, ...params },
      responseType: 'blob',
    });
    return response.data;
  }
}

export default new ReportService();
```

### 6.3 Sidebar Navigation Update

Update `components/layout/sidebar.tsx` to restructure the Report Management section:

```typescript
{
  name: 'Report Management',
  icon: FileText,
  children: [
    // ── Inventory Reports ──
    { name: 'Stock Valuation', href: '/reports/inventory/stock-valuation', icon: FileSpreadsheet, permission: 'view-stock-valuation-report' },
    { name: 'Stock Aging', href: '/reports/inventory/stock-aging', icon: FileSpreadsheet, permission: 'view-stock-aging-report' },
    { name: 'ABC Analysis', href: '/reports/inventory/abc-analysis', icon: FileSpreadsheet, permission: 'view-abc-analysis-report' },
    { name: 'Dead Stock', href: '/reports/inventory/dead-stock', icon: FileSpreadsheet, permission: 'view-dead-stock-report' },
    { name: 'Reorder Report', href: '/reports/inventory/reorder', icon: FileSpreadsheet, permission: 'view-reorder-report' },
    { name: 'Low Stock', href: '/reports/inventory/low-stock', icon: FileSpreadsheet, permission: 'view-low-stock-report' },
    { name: 'Stock Movement', href: '/reports/inventory/stock-movement', icon: FileSpreadsheet, permission: 'view-stock-movement-report' },
    { name: 'Stock Adjustment', href: '/reports/inventory/stock-adjustment', icon: FileSpreadsheet, permission: 'view-stock-adjustment-report' },
    { name: 'Batch & Expiry', href: '/reports/inventory/batch-expiry', icon: FileSpreadsheet, permission: 'view-batch-expiry-report' },
    { name: 'Shrinkage', href: '/reports/inventory/shrinkage', icon: FileSpreadsheet, permission: 'view-shrinkage-report' },
    { name: 'Inventory Turnover', href: '/reports/inventory/turnover', icon: FileSpreadsheet, permission: 'view-turnover-report' },

    // ── Sales Reports ──
    { name: 'Sales by Product', href: '/reports/sales/by-product', icon: FileSpreadsheet, permission: 'view-sales-by-product-report' },
    { name: 'Sales by Customer', href: '/reports/sales/by-customer', icon: FileSpreadsheet, permission: 'view-sales-by-customer-report' },
    { name: 'Sales by Category', href: '/reports/sales/by-category', icon: FileSpreadsheet, permission: 'view-sales-by-category-report' },
    { name: 'Salesperson Performance', href: '/reports/sales/salesperson-performance', icon: FileSpreadsheet, permission: 'view-salesperson-performance-report' },
    { name: 'Profit Margin', href: '/reports/sales/profit-margin', icon: FileSpreadsheet, permission: 'view-profit-margin-report' },
    { name: 'Return Analysis', href: '/reports/sales/return-analysis', icon: FileSpreadsheet, permission: 'view-return-analysis-report' },
    { name: 'Sales Trend', href: '/reports/sales/sales-trend', icon: FileSpreadsheet, permission: 'view-sales-trend-report' },

    // ── Purchase Reports ──
    { name: 'PO Summary', href: '/reports/purchase/po-summary', icon: FileSpreadsheet, permission: 'view-po-summary-report' },
    { name: 'Supplier Performance', href: '/reports/purchase/supplier-performance', icon: FileSpreadsheet, permission: 'view-supplier-performance-report' },
    { name: 'Purchase by Supplier', href: '/reports/purchase/by-supplier', icon: FileSpreadsheet, permission: 'view-purchase-by-supplier-report' },
    { name: 'GRN Register', href: '/reports/purchase/grn-register', icon: FileSpreadsheet, permission: 'view-grn-report' },
    { name: 'Purchase Return', href: '/reports/purchase/purchase-return', icon: FileSpreadsheet, permission: 'view-purchase-return-report' },

    // ── POS Reports ──
    { name: 'POS Daily Sales', href: '/reports/pos/daily-sales', icon: FileSpreadsheet, permission: 'view-pos-daily-sales-report' },
    { name: 'Session Summary (Z-Report)', href: '/reports/pos/session-summary', icon: FileSpreadsheet, permission: 'view-pos-session-report' },
    { name: 'Cashier Performance', href: '/reports/pos/cashier-performance', icon: FileSpreadsheet, permission: 'view-cashier-performance-report' },
    { name: 'Hourly Sales', href: '/reports/pos/hourly-sales', icon: FileSpreadsheet, permission: 'view-hourly-sales-report' },
    { name: 'Payment Breakdown', href: '/reports/pos/payment-breakdown', icon: FileSpreadsheet, permission: 'view-payment-breakdown-report' },
    { name: 'POS Refund Summary', href: '/reports/pos/refund-summary', icon: FileSpreadsheet, permission: 'view-pos-refund-report' },

    // ── Accounting Reports ──
    { name: 'Trial Balance', href: '/reports/trial-balance', icon: Scale, permission: 'view-trail-balance' },
    { name: 'Profit & Loss', href: '/reports/profit-loss', icon: FileText, permission: 'view-profit-loss' },
    { name: 'Cash Flow', href: '/reports/cash-flow', icon: FileText, permission: 'view-cash-flow' },
    { name: 'Balance Sheet', href: '/reports/balance-sheet', icon: Landmark, permission: 'view-balance-sheet' },
    { name: 'AR Aging', href: '/reports/accounting/ar-aging', icon: FileSpreadsheet, permission: 'view-ar-aging-report' },
    { name: 'AP Aging', href: '/reports/accounting/ap-aging', icon: FileSpreadsheet, permission: 'view-ap-aging-report' },
    { name: 'Tax Return', href: '/reports/accounting/tax-return', icon: FileSpreadsheet, permission: 'view-tax-return-report' },
    { name: 'Cash Flow Forecast', href: '/reports/accounting/cash-flow-forecast', icon: FileSpreadsheet, permission: 'view-cash-flow-forecast-report' },
    { name: 'Failed Journal Queue', href: '/reports/accounting/failed-journal', icon: FileSpreadsheet, permission: 'view-failed-journal-report' },

    // ── Customer Reports ──
    { name: 'Customer Statement', href: '/reports/customer/statement', icon: FileSpreadsheet, permission: 'view-customer-statement' },
    { name: 'Customer Aging', href: '/reports/customer/aging', icon: FileSpreadsheet, permission: 'view-customer-aging-report' },
    { name: 'Customer Profitability', href: '/reports/customer/profitability', icon: FileSpreadsheet, permission: 'view-customer-profitability-report' },

    // ── Supplier Reports ──
    { name: 'Supplier Statement', href: '/reports/supplier/statement', icon: FileSpreadsheet, permission: 'view-supplier-statement' },
    { name: 'Supplier Aging', href: '/reports/supplier/aging', icon: FileSpreadsheet, permission: 'view-supplier-aging-report' },
    { name: 'Supplier Scorecard', href: '/reports/supplier/scorecard', icon: FileSpreadsheet, permission: 'view-supplier-scorecard-report' },

    // ── Product Reports ──
    { name: 'Product Profitability', href: '/reports/product/profitability', icon: FileSpreadsheet, permission: 'view-product-profitability-report' },
    { name: 'Price List', href: '/reports/product/price-list', icon: FileSpreadsheet, permission: 'view-price-list-report' },
    { name: 'Stock Status', href: '/reports/product/stock-status', icon: FileSpreadsheet, permission: 'view-stock-status-report' },

    // ── Warehouse Reports ──
    { name: 'Warehouse Stock Summary', href: '/reports/warehouse/stock-summary', icon: FileSpreadsheet, permission: 'view-warehouse-stock-report' },
    { name: 'Bin Utilization', href: '/reports/warehouse/bin-utilization', icon: FileSpreadsheet, permission: 'view-bin-utilization-report' },
    { name: 'Stock Transfer', href: '/reports/warehouse/transfer', icon: FileSpreadsheet, permission: 'view-transfer-report' },

    // ── System Reports ──
    { name: 'Audit Log', href: '/reports/system/audit-log', icon: FileSpreadsheet, permission: 'view-audit-log-report' },
    { name: 'Activity Log', href: '/reports/system/activity-log', icon: FileSpreadsheet, permission: 'view-activity-log-report' },
    { name: 'Alert History', href: '/reports/system/alert-history', icon: FileSpreadsheet, permission: 'view-alert-history-report' },
  ],
}
```

---

## 7. Backend Implementation Plan

### 7.1 ReportController Structure

```php
// app/Http/Controllers/Api/ReportController.php

class ReportController extends Controller
{
    use ReportTrait;

    // ── Inventory Reports ──
    public function stockValuation(Request $request): JsonResponse
    public function stockAging(Request $request): JsonResponse
    public function abcAnalysis(Request $request): JsonResponse
    public function deadStock(Request $request): JsonResponse
    public function reorderReport(Request $request): JsonResponse
    public function lowStockReport(Request $request): JsonResponse
    public function stockMovementReport(Request $request): JsonResponse
    public function stockAdjustmentReport(Request $request): JsonResponse
    public function batchExpiryReport(Request $request): JsonResponse
    public function shrinkageReport(Request $request): JsonResponse
    public function turnoverReport(Request $request): JsonResponse

    // ── Sales Reports ──
    public function salesByProduct(Request $request): JsonResponse
    public function salesByCustomer(Request $request): JsonResponse
    public function salesByCategory(Request $request): JsonResponse
    public function salespersonPerformance(Request $request): JsonResponse
    public function profitMargin(Request $request): JsonResponse
    public function returnAnalysis(Request $request): JsonResponse
    public function salesTrend(Request $request): JsonResponse

    // ── Purchase Reports ──
    public function poSummary(Request $request): JsonResponse
    public function supplierPerformance(Request $request): JsonResponse
    public function purchaseBySupplier(Request $request): JsonResponse
    public function grnRegister(Request $request): JsonResponse
    public function purchaseReturn(Request $request): JsonResponse

    // ── POS Reports ──
    public function posDailySales(Request $request): JsonResponse
    public function posSessionSummary(Request $request): JsonResponse
    public function cashierPerformance(Request $request): JsonResponse
    public function hourlySales(Request $request): JsonResponse
    public function paymentBreakdown(Request $request): JsonResponse
    public function posRefundSummary(Request $request): JsonResponse

    // ── Customer Reports ──
    public function customerAging(Request $request): JsonResponse
    public function customerProfitability(Request $request): JsonResponse

    // ── Supplier Reports ──
    public function supplierStatement(Request $request): JsonResponse
    public function supplierAging(Request $request): JsonResponse
    public function supplierScorecard(Request $request): JsonResponse

    // ── Product Reports ──
    public function productProfitability(Request $request): JsonResponse
    public function priceList(Request $request): JsonResponse
    public function stockStatus(Request $request): JsonResponse

    // ── Warehouse Reports ──
    public function warehouseStockSummary(Request $request): JsonResponse
    public function binUtilization(Request $request): JsonResponse
    public function stockTransfer(Request $request): JsonResponse

    // ── Tax Reports ──
    public function taxReturn(Request $request): JsonResponse
    public function taxSummary(Request $request): JsonResponse

    // ── System Reports ──
    public function auditLog(Request $request): JsonResponse
    public function activityLog(Request $request): JsonResponse
    public function alertHistory(Request $request): JsonResponse

    // ── Export ──
    public function export(Request $request, string $category, string $name): Response
}
```

### 7.2 Route Registration

```php
// routes/api/reports.php

Route::prefix('v1/reports')->middleware('auth:sanctum')->group(function () {

    // ── Inventory ──
    Route::get('inventory/stock-valuation', [ReportController::class, 'stockValuation']);
    Route::get('inventory/stock-aging', [ReportController::class, 'stockAging']);
    Route::get('inventory/abc-analysis', [ReportController::class, 'abcAnalysis']);
    Route::get('inventory/dead-stock', [ReportController::class, 'deadStock']);
    Route::get('inventory/reorder', [ReportController::class, 'reorderReport']);
    Route::get('inventory/low-stock', [ReportController::class, 'lowStockReport']);
    Route::get('inventory/stock-movement', [ReportController::class, 'stockMovementReport']);
    Route::get('inventory/stock-adjustment', [ReportController::class, 'stockAdjustmentReport']);
    Route::get('inventory/batch-expiry', [ReportController::class, 'batchExpiryReport']);
    Route::get('inventory/shrinkage', [ReportController::class, 'shrinkageReport']);
    Route::get('inventory/turnover', [ReportController::class, 'turnoverReport']);

    // ── Sales ──
    Route::get('sales/by-product', [ReportController::class, 'salesByProduct']);
    Route::get('sales/by-customer', [ReportController::class, 'salesByCustomer']);
    Route::get('sales/by-category', [ReportController::class, 'salesByCategory']);
    Route::get('sales/salesperson-performance', [ReportController::class, 'salespersonPerformance']);
    Route::get('sales/profit-margin', [ReportController::class, 'profitMargin']);
    Route::get('sales/return-analysis', [ReportController::class, 'returnAnalysis']);
    Route::get('sales/trend', [ReportController::class, 'salesTrend']);

    // ── Purchase ──
    Route::get('purchase/po-summary', [ReportController::class, 'poSummary']);
    Route::get('purchase/supplier-performance', [ReportController::class, 'supplierPerformance']);
    Route::get('purchase/by-supplier', [ReportController::class, 'purchaseBySupplier']);
    Route::get('purchase/grn-register', [ReportController::class, 'grnRegister']);
    Route::get('purchase/purchase-return', [ReportController::class, 'purchaseReturn']);

    // ── POS ──
    Route::get('pos/daily-sales', [ReportController::class, 'posDailySales']);
    Route::get('pos/session-summary', [ReportController::class, 'posSessionSummary']);
    Route::get('pos/cashier-performance', [ReportController::class, 'cashierPerformance']);
    Route::get('pos/hourly-sales', [ReportController::class, 'hourlySales']);
    Route::get('pos/payment-breakdown', [ReportController::class, 'paymentBreakdown']);
    Route::get('pos/refund-summary', [ReportController::class, 'posRefundSummary']);

    // ── Accounting (some already exist under /reports/) ──
    Route::get('accounting/ar-aging', [AccountController::class, 'receivables']);  // alias
    Route::get('accounting/ap-aging', [AccountController::class, 'payables']);     // alias
    Route::get('accounting/tax-return', [ReportController::class, 'taxReturn']);
    Route::get('accounting/cash-flow-forecast', [ReportController::class, 'cashFlowForecast']);
    Route::get('accounting/tax-summary', [ReportController::class, 'taxSummary']);

    // ── Customer ──
    Route::get('customer/aging', [ReportController::class, 'customerAging']);
    Route::get('customer/profitability', [ReportController::class, 'customerProfitability']);

    // ── Supplier ──
    Route::get('supplier/statement', [ReportController::class, 'supplierStatement']);
    Route::get('supplier/aging', [ReportController::class, 'supplierAging']);
    Route::get('supplier/scorecard', [ReportController::class, 'supplierScorecard']);

    // ── Product ──
    Route::get('product/profitability', [ReportController::class, 'productProfitability']);
    Route::get('product/price-list', [ReportController::class, 'priceList']);
    Route::get('product/stock-status', [ReportController::class, 'stockStatus']);

    // ── Warehouse ──
    Route::get('warehouse/stock-summary', [ReportController::class, 'warehouseStockSummary']);
    Route::get('warehouse/bin-utilization', [ReportController::class, 'binUtilization']);
    Route::get('warehouse/transfer', [ReportController::class, 'stockTransfer']);

    // ── System ──
    Route::get('system/audit-log', [ReportController::class, 'auditLog']);
    Route::get('system/activity-log', [ReportController::class, 'activityLog']);
    Route::get('system/alert-history', [ReportController::class, 'alertHistory']);

    // ── Export (generic) ──
    Route::get('{category}/{name}/export', [ReportController::class, 'export']);
});
```

### 7.3 Report Service Pattern

Each report should be implemented as a dedicated class for testability and reusability:

```php
// app/Reports/Inventory/StockValuationReport.php

class StockValuationReport
{
    public function generate(array $params): array
    {
        $warehouseId = $params['warehouse_id'] ?? null;
        $asOfDate = $params['as_of_date'] ?? now()->toDateString();
        $costingMethod = $params['costing_method'] ?? 'weighted_avg';
        $categoryId = $params['category_id'] ?? null;

        $query = Stock::with(['product.category', 'variation', 'warehouse'])
            ->where('tenant_id', auth()->user()->tenant_id);

        if ($warehouseId) {
            $query->where('warehouse_id', $warehouseId);
        }

        if ($categoryId) {
            $query->whereHas('product', fn($q) => $q->where('category_id', $categoryId));
        }

        $stocks = $query->get();

        $rows = $stocks->map(function ($stock) use ($costingMethod) {
            $unitCost = $this->getUnitCost($stock, $costingMethod);
            return [
                'product' => $stock->product->name,
                'variation' => $stock->variation?->name,
                'sku' => $stock->variation?->sku ?? $stock->product->sku,
                'warehouse' => $stock->warehouse->name,
                'quantity' => (float) $stock->quantity,
                'reserved' => (float) $stock->reserved_quantity,
                'available' => (float) $stock->available_quantity,
                'unit_cost' => $unitCost,
                'total_value' => $stock->quantity * $unitCost,
            ];
        });

        return [
            'data' => $rows,
            'summary' => [
                'total_skus' => $rows->count(),
                'total_quantity' => $rows->sum('quantity'),
                'total_value' => $rows->sum('total_value'),
                'avg_cost' => $rows->count() > 0 ? $rows->avg('unit_cost') : 0,
            ],
            'params' => $params,
        ];
    }

    private function getUnitCost(Stock $stock, string $method): float
    {
        return match ($method) {
            'standard' => (float) ($stock->variation?->cost_price ?? $stock->product?->cost_price ?? 0),
            'weighted_avg' => (float) ($stock->average_cost ?? $stock->variation?->cost_price ?? 0),
            'last' => (float) ($stock->last_cost ?? $stock->variation?->cost_price ?? 0),
            default => (float) ($stock->variation?->cost_price ?? 0),
        };
    }
}
```

### 7.4 Export Service

```php
// app/Services/ExportService.php

class ExportService
{
    public function exportPdf(string $view, array $data, string $filename): Response
    {
        $pdf = Pdf::loadView($view, $data);
        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => "attachment; filename=\"{$filename}.pdf\"",
        ]);
    }

    public function exportExcel(string $exportClass, string $filename): BinaryFileResponse
    {
        return Excel::download(new $exportClass(), "{$filename}.xlsx");
    }

    public function exportCsv(array $data, string $filename): Response
    {
        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');
            if (!empty($data)) {
                fputcsv($file, array_keys($data[0]));
                foreach ($data as $row) {
                    fputcsv($file, array_values($row));
                }
            }
            fclose($file);
        };

        return response()->stream($callback, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}.csv\"",
        ]);
    }
}
```

### 7.5 Caching Strategy

Reports can be expensive — cache per tenant per parameter set:

```php
$cacheKey = "report:{$tenantId}:stock-valuation:" . md5(json_encode($params));
return Cache::remember($cacheKey, 300, fn() => (new StockValuationReport())->generate($params));
```

- **5-minute cache** for real-time reports (stock, sales today)
- **1-hour cache** for historical reports (P&L, balance sheet)
- **No cache** for audit logs, activity logs, alerts
- **Cache invalidation** on any write to the affected tables

### 7.6 Performance Considerations

| Concern | Mitigation |
|---------|------------|
| Large datasets (10k+ products) | Paginate report results; for exports, use queue jobs |
| Complex joins | Add composite indexes on report filter columns |
| Date-range queries | Index `created_at` / `order_date` / `entry_date` on all transactional tables |
| Report generation timeout | Move heavy exports to Laravel queue jobs |
| Concurrent report requests | Rate-limit report endpoints (60/min per user) |

---

## 8. Permission Matrix

### 8.1 New Permissions to Seed

```php
// database/seeders/ReportPermissionSeeder.php

$reportPermissions = [
    // Inventory Reports
    'view-stock-valuation-report',
    'view-stock-aging-report',
    'view-abc-analysis-report',
    'view-dead-stock-report',
    'view-reorder-report',
    'view-low-stock-report',
    'view-stock-movement-report',
    'view-stock-adjustment-report',
    'view-batch-expiry-report',
    'view-shrinkage-report',
    'view-turnover-report',

    // Sales Reports
    'view-sales-by-product-report',
    'view-sales-by-customer-report',
    'view-sales-by-category-report',
    'view-salesperson-performance-report',
    'view-profit-margin-report',
    'view-return-analysis-report',
    'view-sales-trend-report',

    // Purchase Reports
    'view-po-summary-report',
    'view-supplier-performance-report',
    'view-purchase-by-supplier-report',
    'view-grn-report',
    'view-purchase-return-report',

    // POS Reports
    'view-pos-daily-sales-report',
    'view-pos-session-report',
    'view-cashier-performance-report',
    'view-hourly-sales-report',
    'view-payment-breakdown-report',
    'view-pos-refund-report',

    // Accounting Reports (some already exist)
    'view-ar-aging-report',
    'view-ap-aging-report',
    'view-tax-return-report',
    'view-tax-summary-report',
    'view-cash-flow-forecast-report',
    'view-failed-journal-report',
    'view-budget-report',

    // Customer Reports
    'view-customer-statement',
    'view-customer-aging-report',
    'view-customer-profitability-report',

    // Supplier Reports
    'view-supplier-statement',
    'view-supplier-aging-report',
    'view-supplier-scorecard-report',

    // Product Reports
    'view-product-profitability-report',
    'view-price-list-report',
    'view-stock-status-report',

    // Warehouse Reports
    'view-warehouse-stock-report',
    'view-bin-utilization-report',
    'view-transfer-report',

    // System Reports
    'view-audit-log-report',
    'view-activity-log-report',
    'view-alert-history-report',
];
```

### 8.2 Permission Grouping

| Role | Report Access |
|------|---------------|
| **super_admin** | All reports across all tenants |
| **tenant_admin** | All reports within their tenant |
| **tenant_user** | Only reports they have explicit permissions for |

---

## 9. Implementation Phases

### Phase 1 — Critical Reports (P0) — DONE ✅

> All P0 reports are built (UI complete, tenant-filtering implemented).

| # | Report | Backend | Frontend | Status |
|---|--------|---------|----------|--------|
| 1 | AR Aging | EXISTS | Done | ✅ |
| 2 | AP Aging | EXISTS | Done | ✅ |
| 3 | Failed Journal Queue | EXISTS | Done | ✅ |
| 4 | Stock Valuation | Build | Done | ✅ |
| 5 | Reorder / Low Stock | Build | Done | ✅ |
| 6 | Stock Movement Ledger | Build | Done | ✅ |
| 7 | Batch & Expiry | Build | Done | ✅ |
| 8 | Sales by Product | Build | Done | ✅ |
| 9 | Sales by Customer | Build | Done | ✅ |
| 10 | Sales Trend | Build | Done | ✅ |
| 11 | POS Daily Sales | Build | Done | ✅ |
| 12 | POS Session Summary | Build | Done | ✅ |
| 13 | Customer Statement (print) | EXISTS | Done | ✅ |
| 14 | Customer Aging | Build | Done | ✅ |
| 15 | Supplier Aging | Build | Done | ✅ |
| 16 | PO Summary | Build | Done | ✅ |
| 17 | Product Stock Status | Build | Done | ✅ |
| 18 | Warehouse Stock Summary | Build | Done | ✅ |
| 19 | Audit Log | Build | Done | ✅ |

**Delivered:**
- ✅ 45+ frontend report pages across 10+ categories
- ✅ `reportService.ts` with 45+ methods + `tenant_id` support
- ✅ `accountService.ts` with 6 financial report methods + `tenant_id` support
- ✅ `ReportLayout`, `ReportFilters`, `ReportExportBar`, `ReportTable`, `ReportSummaryCards`, `ReportChart`, `ReportEmptyState` components
- ✅ `TenantSelect` component for multi-tenant filtering
- ✅ Export infrastructure (PDF via jspdf/html2canvas, CSV, Print)
- ✅ All pages implement tenant-based data filtering
- ✅ Sidebar navigation with all categories

### Phase 2 — High Priority Reports (P1) — DONE ✅

All P1 reports are now built.

| # | Report | Status |
|---|--------|--------|
| 1 | Stock Aging | ✅ |
| 2 | ABC Analysis | ✅ |
| 3 | Dead Stock | ✅ |
| 4 | Stock Adjustment | ✅ |
| 5 | Sales by Category | ✅ |
| 6 | Profit Margin | ✅ |
| 7 | Return Analysis | ✅ |
| 8 | Supplier Performance | ✅ |
| 9 | Purchase by Supplier | ✅ |
| 10 | GRN Register | ✅ |
| 11 | Cashier Performance | ✅ |
| 12 | Payment Breakdown | ✅ |
| 13 | POS Refund Summary | ✅ |
| 14 | VAT Return / Tax Return | ✅ |
| 15 | Customer Profitability | ✅ |
| 16 | Supplier Statement | ✅ |
| 17 | Product Profitability | ✅ |
| 18 | Activity Log | ✅ |

### Phase 3 — Medium Priority Reports (P2) — Most DONE ✅

| # | Report | Status |
|---|--------|--------|
| 1 | Inventory Turnover | ✅ |
| 2 | Shrinkage | ✅ |
| 3 | Salesperson Performance | ✅ |
| 4 | Purchase Return | ✅ |
| 5 | Hourly Sales | ✅ |
| 6 | Cash Flow Forecast | 🔲 Backend needed |
| 7 | Supplier Scorecard | ✅ |
| 8 | Price List | ✅ |
| 9 | Stock Transfer | ✅ |
| 10 | Tax Summary | ✅ |
| 11 | User Activity | 🔲 Backend needed |
| 12 | Business-type specific (pharmacy, restaurant, fashion) | 🔲 Needs backend |

### Phase 4 — Low Priority / Future Reports (P3) — Ongoing

| # | Report | Effort | Status |
|---|--------|--------|--------|
| 1 | Budget vs Actual | M | 🔲 Needs backend |
| 2 | Bin Utilization | S | ✅ |
| 3 | Alert History | S | ✅ |
| 4 | BOM Cost | M | 🔲 Needs manufacturing module |
| 5 | Production Output | M | 🔲 Needs manufacturing module |
| 6 | Salesperson Commission | S | 🔲 Needs backend |
| 7 | Scheduled email reports | L | 🔲 Future |
| 8 | Report subscriptions | L | 🔲 Future |
| 9 | Report templates | M | 🔲 Future |
| 10 | AI-powered insights | L | 🔲 Future |

---

## 10. Report UI/UX Guidelines

### 10.1 Report Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Icon] Report Title                              [Export ▼] [Print]│
│  Brief description of what this report shows                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──── Filters ──────────────────────────────────────────────────┐  │
│  │  Date Range: [Start] to [End]   Warehouse: [▼ All]           │  │
│  │  Category: [▼ All]              [Apply]  [Reset]             │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │ KPI 1    │  │ KPI 2    │  │ KPI 3    │  │ KPI 4    │          │
│  │ Value    │  │ Value    │  │ Value    │  │ Value    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──── Chart (optional) ────────────────────────────────────────┐  │
│  │                                                               │  │
│  │         [Area / Bar / Line / Donut Chart]                     │  │
│  │                                                               │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│  ┌──── Data Table ──────────────────────────────────────────────┐  │
│  │  Column1  │ Column2  │ Column3  │ Column4  │ ...  │  Sortable │  │
│  │  ...      │ ...      │ ...      │ ...      │ ...  │  Paginated│  │
│  └───────────────────────────────────────────────────────────────┘  │
│  [Showing 1-25 of 1,234]                    [Prev] [1] [2] [Next]  │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.2 Standard Report Features

Every report page MUST have:

1. **Title & Description** — Clear name + 1-line description
2. **Filters** — Date range, warehouse, category at minimum; report-specific filters as needed
3. **Apply / Reset buttons** — Explicit filter application (no auto-fetch on every keystroke)
4. **Summary KPIs** — 3-4 cards above the table with key metrics
5. **Data Table** — Sortable columns, pagination (25/50/100 per page)
6. **Export bar** — PDF, Excel, CSV, Print buttons
7. **Empty state** — "No data found for the selected filters"
8. **Loading state** — Skeleton rows while fetching
9. **Error state** — Error message with retry button
10. **Responsive** — Works on mobile (stacked layout)

### 10.3 Color Palette for Reports

```
Revenue / Positive:  #22C55E (green-500)
Cost / Negative:     #EF4444 (red-500)
Warning / Low:       #F59E0B (amber-500)
Info / Neutral:      #3B82F6 (blue-500)
Primary:             #6366F1 (indigo-500)
Background:          #F9FAFB (gray-50)
Border:              #E5E7EB (gray-200)
```

### 10.4 Currency & Date Formatting

```typescript
// lib/utils/format.ts
export function formatCurrency(amount: number, currency = 'BDT'): string {
  const symbol = currency === 'BDT' ? '৳' : '$';
  return `${symbol}${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'datetime' = 'short'): string {
  const d = new Date(date);
  const locale = 'en-GB'; // dd/MM/yyyy
  switch (format) {
    case 'short': return d.toLocaleDateString(locale);
    case 'long': return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
    case 'datetime': return d.toLocaleString(locale);
  }
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-BD', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}
```

---

## Summary — Complete Report Inventory

| Category | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Total | Built |
|----------|---------------|-----------|-------------|----------|-------|-------|
| Inventory & Stock | 6 | 4 | 2 | 0 | 12 | 12 ✅ |
| Sales | 3 | 3 | 1 | 0 | 7 | 7 ✅ |
| Purchase | 2 | 3 | 1 | 0 | 6 | 6 ✅ |
| POS | 2 | 3 | 1 | 0 | 6 | 6 ✅ |
| Accounting | 4 | 1 | 1 | 1 | 7 | 3 (UI done) |
| Customer | 2 | 1 | 1 | 0 | 4 | 4 ✅ |
| Supplier | 1 | 1 | 1 | 0 | 3 | 3 ✅ |
| Product | 1 | 1 | 1 | 0 | 3 | 3 ✅ |
| Warehouse | 1 | 0 | 2 | 0 | 3 | 3 ✅ |
| Tax | 0 | 1 | 1 | 0 | 2 | 2 ✅ |
| Manufacturing | 0 | 0 | 0 | 2 | 2 | 0 🔲 |
| HR | 0 | 0 | 0 | 2 | 2 | 0 🔲 |
| System | 1 | 1 | 1 | 1 | 4 | 3 (all but export infrastructure) |
| Business-type | 0 | 0 | 6 | 0 | 6 | 0 🔲 |
| **TOTAL** | **23** | **19** | **18** | **6** | **66** | **52 built** |

### Existing vs. Needed (Updated Jul 2026)

| Status | Count |
|--------|-------|
| Already built (UI done, backend + frontend) | 52 |
| Backend exists, UI missing | 0 |
| Need to build (Backend + UI) | 14 (Manufacturing 2, HR 2, Business-type 6, advanced accounting 4) |
| **Total target reports** | **66** |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Added changelog section |
| 2026-07-10 | Updated §2.1: expanded from 6 to 55 frontend report pages |
| 2026-07-10 | Updated §2.4: marked 10/14 categories as complete ("What is Missing") |
| 2026-07-10 | Added §2.5: Tenant-Based Data Filtering section |
| 2026-07-10 | Updated §3.2: marked architecture from "NEW" to "EXISTS" |
| 2026-07-10 | Updated §6: marked Frontend Implementation Plan as mostly delivered |
| 2026-07-10 | Updated §9: Phase 1 (P0) and Phase 2 (P1) marked DONE, Phase 3 (P2) mostly done |
| 2026-07-10 | Updated Summary: 52/66 reports built; "Backend exists, UI missing" → 0 |
| 2026-07-10 | Updated Key Numbers: report pages 6 → 45+, categories 1 → 10+ |
| 2026-07-09 | Initial report generation plan created |

*This document is the single source of truth for report generation in UIMS. Each implementation phase should tick off items and append a changelog at the bottom.*
