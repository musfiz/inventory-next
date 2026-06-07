# UPCOMMING_DEV_ITEM — Universal Inventory Management System Roadmap

> Generated: 2026-06-06
> Sources read: `inventory-api/app/Models/**`, `inventory-api/database/migrations/**`, `inventory-api/app/Http/Controllers/Api/**`, `inventory-api/routes/api.php`, `inventory-api/app/Services/**`, `inventory-api/database/seeders/**`, `inventory-ui/app/**`.

This document does **three** things:

1. **Inventory of the existing system** — every Eloquent model + every migration table (57 models, 43 migrations).
2. **Gap analysis** — what is in the DB but not wired to controllers/routes, what controllers/routes exist but are thin, and what UI pages are missing for the data that already exists.
3. **Roadmap to "universal inventory"** — what the system still needs to be usable by any business type (retail, wholesale, manufacturing, distribution, services, restaurants, pharmacies, real-estate, e-commerce, etc.).

---

## 1. Existing System — Full Inventory

### 1.1 Models & Tables by Domain

| # | Domain | Model | Table | Migration |
|---|--------|-------|-------|-----------|
| 1 | Tenancy | `Tenant` | `tenants` | `2026_01_24_000001` |
| 2 | Tenancy | — | `domains` | `2026_01_24_000002` |
| 3 | Tenancy | `TenantSetting` | `tenant_settings` | `2026_01_24_000012` |
| 4 | Tenancy | `TenantAttribute` | `tenant_attributes` (inferred) | n/a — file present |
| 5 | Tenancy | `TenantAttributeValue` | `tenant_attribute_values` (inferred) | n/a — file present |
| 6 | Auth | `User` | `users` | `2026_01_24_000002` |
| 7 | Auth | `Permission` | `permissions` | `2026_02_13_051125` |
| 8 | Auth | `PermissionUser` | `permission_users` | `2026_02_13_051852` |
| 9 | Auth | `Module` | `modules` | `2026_02_13_050944` |
| 10 | Catalog | `Category` | `categories` | `2026_01_24_000003` |
| 11 | Catalog | `Brand` | `brands` | `2026_01_24_000003` |
| 12 | Catalog | `Unit` | `units` | `2026_01_24_000003` |
| 13 | Catalog | `Attribute` | `attributes` | `2026_01_24_000005` |
| 14 | Catalog | `AttributeValue` | `attribute_values` | `2026_01_24_000005` |
| 15 | Catalog | `Product` | `products` | `2026_01_24_000004` |
| 16 | Catalog | `ProductVariation` | `product_variations` | `2026_01_24_000007` |
| 17 | Catalog | `ProductVariationAttribute` | `product_variation_attributes` | `2026_01_24_000007` |
| 18 | Catalog | `ProductImage` | `product_images` | `2026_01_24_000007` |
| 19 | Catalog | `ProductBarcode` | `product_barcodes` | `2026_01_24_000007` |
| 20 | Inventory | `Warehouse` | `warehouses` | `2026_01_24_000009` |
| 21 | Inventory | `Bin` | `bins` | `2026_01_24_000016` |
| 22 | Inventory | `Stock` | `stocks` | `2026_01_24_000009` |
| 23 | Inventory | `Batch` | `batches` | `2026_01_24_000009` |
| 24 | Inventory | `StockMovement` | `stock_movements` | `2026_01_24_000009` |
| 25 | Inventory | — | `stock_locations` (table only) | `2026_01_24_000016` |
| 26 | Inventory | — | `third_party_logistics` (table only) | `2026_01_24_000016` |
| 27 | Procurement | `Supplier` | `suppliers` | `2026_01_24_000010` |
| 28 | Procurement | `PurchaseOrder` | `purchase_orders` | `2026_01_24_000010` |
| 29 | Procurement | `PurchaseOrderItem` | `purchase_order_items` | `2026_01_24_000010` |
| 30 | Procurement | `PurchaseReturn` | `purchase_returns` | `2026_01_24_000010` |
| 31 | Procurement | `PurchaseReturnItem` | `purchase_return_items` | `2026_01_24_000010` |
| 32 | Sales | `Customer` | `customers` | `2026_01_24_000011` |
| 33 | Sales | `SalesOrder` | `sales_orders` | `2026_01_24_000011` |
| 34 | Sales | `SalesOrderItem` | `sales_order_items` | `2026_01_24_000011` |
| 35 | Sales | `SalesReturn` | `sales_returns` | `2026_01_24_000011` |
| 36 | Sales | `SalesReturnItem` | `sales_return_items` | `2026_01_24_000011` |
| 37 | Sales | `SalesReturnPayment` | `sales_return_payments` | `2026_06_02_000004` |
| 38 | POS | `PosRegister` | `pos_registers` | `2026_01_24_000015` |
| 39 | POS | `PosSession` | `pos_sessions` | `2026_01_24_000015` |
| 40 | POS | `PosOrder` | `pos_orders` | `2026_01_24_000015` |
| 41 | POS | `PosOrderItem` | `pos_order_items` | `2026_01_24_000015` |
| 42 | POS | `PosHoldOrder` | `pos_hold_orders` | `2026_01_24_000023` |
| 43 | POS | `PosRefund` | `pos_refunds` | `2026_01_24_000023` |
| 44 | POS | `PosRefundItem` | `pos_refund_items` | `2026_06_01_000001` |
| 45 | Payments | `Payment` | `payments` (unified) | `2026_05_22_000001` |
| 46 | Accounting | `FiscalPeriod` | `fiscal_periods` | `2026_04_30_000001` |
| 47 | Accounting | `Account` | `accounts` | `2026_04_30_000001` |
| 48 | Accounting | `BankAccount` | `bank_accounts` | `2026_04_30_000001` |
| 49 | Accounting | `TaxRate` | `tax_rates` | `2026_04_30_000001` |
| 50 | Accounting | `TaxEntry` | `tax_entries` | `2026_04_30_000001` |
| 51 | Accounting | `JournalEntry` | `journal_entries` | `2026_04_30_000001` |
| 52 | Accounting | `JournalEntryLine` | `journal_entry_lines` | `2026_04_30_000001` |
| 53 | Accounting | `AccountReconciliation` | `account_reconciliations` | `2026_04_30_000001` |
| 54 | Accounting | `FailedJournalEntry` | `failed_journal_entries` | `2026_06_05_000001` |
| 55 | Expenses | `Expense` | `expenses` | `2026_01_24_000012` |
| 56 | Pharmacy | (no model) | `prescriptions` | `2026_01_24_000013` |
| 57 | Pharmacy | (no model) | `prescription_items` | `2026_01_24_000013` |
| 58 | Pharmacy | (no model) | `drug_database` | `2026_01_24_000013` |
| 59 | Pharmacy | (no model) | `pharmacy_compliance` | `2026_01_24_000013` |
| 60 | Pharmacy | (no model) | `drug_interactions` | `2026_01_24_000013` |
| 61 | Real-estate | (no model) | `properties` | `2026_01_24_000015` |
| 62 | Real-estate | (no model) | `property_items` | `2026_01_24_000015` |
| 63 | Manufacturing | (no model) | `bill_of_materials` | `2026_01_24_000017` |
| 64 | Manufacturing | (no model) | `assembly_orders` | `2026_01_24_000017` |
| 65 | Manufacturing | (no model) | `assembly_order_components` | `2026_01_24_000017` |
| 66 | Logistics | (no model) | `deliveries` | `2026_01_24_000018` |
| 67 | Logistics | (no model) | `delivery_items` | `2026_01_24_000018` |
| 68 | Integration | (no model) | `accounting_integrations` | `2026_01_24_000019` |
| 69 | Integration | (no model) | `accounting_sync_logs` | `2026_01_24_000019` |
| 70 | Integration | (no model) | `ecommerce_integrations` | `2026_01_24_000019` |
| 71 | Integration | (no model) | `ecommerce_sync_mappings` | `2026_01_24_000019` |
| 72 | Analytics | (no model) | `abc_categories` | `2026_01_24_000020` |
| 73 | Analytics | (no model) | `stock_aging` | `2026_01_24_000020` |
| 74 | Consignment | (no model) | `consignment_agreements` | `2026_01_24_000021` |
| 75 | Consignment | (no model) | `consignment_stock` | `2026_01_24_000021` |
| 76 | Mobile | (no model) | `mobile_stock_takes` | `2026_01_24_000022` |
| 77 | Mobile | (no model) | `mobile_stock_take_items` | `2026_01_24_000022` |
| 78 | System | `ActivityLog` | `activity_logs` | `2026_01_24_000012` |
| 79 | System | `AuditLog` | `audit_logs` | `2026_01_24_000012` |
| 80 | System | `Notification` | `notifications` | `2026_01_24_000012` |
| 81 | System | `Alert` | `alerts` | `2026_01_24_000012` |

### 1.2 Controllers & API Routes (35 API controllers)

| Controller | Wired routes | Backing model | Backend completeness |
|------------|--------------|---------------|----------------------|
| `AuthController` | login, register, user, switch-user | `User` | ✅ Full |
| `UserController` | CRUD | `User` | ✅ Full |
| `TenantController` | CRUD + register | `Tenant` | ✅ Full |
| `PermissionController` | (route file) | `Permission` | ✅ |
| `UserPermissionController` | assign/remove | `PermissionUser` | ✅ |
| `ModuleController` | CRUD | `Module` | ✅ |
| `BrandController` | CRUD | `Brand` | ✅ |
| `CategoryController` | CRUD + export | `Category` | ✅ |
| `UnitController` | CRUD | `Unit` | ✅ |
| `AttributeController` | CRUD + search | `Attribute` | ✅ |
| `AttributeValueController` | CRUD | `AttributeValue` | ✅ |
| `ProductController` | CRUD + bulk-upload + sample-excel | `Product` | ✅ Full |
| `ProductImageController` | CRUD + set-primary | `ProductImage` | ✅ |
| `ProductVariationController` | CRUD + generate-sku | `ProductVariation` | ✅ |
| `ProductBarcodeController` | CRUD + generate-bulk | `ProductBarcode` | ✅ |
| `WarehouseController` | CRUD | `Warehouse` | ✅ |
| `BinController` | CRUD + dropdown | `Bin` | ✅ |
| `StockController` | index + movements + movements-summary + store | `Stock`, `StockMovement` | ✅ |
| `SupplierController` | CRUD + dropdown | `Supplier` | ✅ |
| `PurchaseOrderController` | CRUD + update-from-details | `PurchaseOrder` | ⚠️ Thin — no receive GRN, no bill, no auto-stock-in |
| `CustomerController` | CRUD + statement + record-payment | `Customer` | ✅ |
| `SalesOrderController` | CRUD + record-payment + items | `SalesOrder` | ✅ |
| `SalesReturnController` | CRUD + approve + complete + cancel + settle-payment | `SalesReturn`, `SalesReturnPayment` | ✅ |
| `PaymentController` | read-only index/show/receipt | `Payment` | ✅ |
| `AccountController` | full + ledger + trial-balance + profit-loss + cash-flow + balance-sheet + receivables + payables | `Account`, `JournalEntry` | ✅ (best in class) |
| `ExpenseController` | full + approve + pay | `Expense` | ✅ |
| `JournalEntryController` | index + store + show + post + reverse | `JournalEntry` | ✅ |
| `FailedJournalEntryController` | index + show + retry + resolve | `FailedJournalEntry` | ✅ |
| `PosRegisterController` | index + store | `PosRegister` | ⚠️ Thin — no update/delete |
| `PosSessionController` | (route file) | `PosSession` | ✅ |
| `PosController` | (route file) | `PosOrder` | ✅ |
| `PosRefundController` | (route file) | `PosRefund`, `PosRefundItem` | ✅ |
| `DashboardController` | (route file) | dashboard data | ✅ |
| `CommonController` | (route file) | lookup data | ✅ |

### 1.3 UI Pages (`inventory-ui/app`)

Existing pages: `login`, `dashboard`, `analytics`, `products`, `products/add`, `products/images`, `product-variations`, `product-variations/add`, `product-barcodes`, `categories`, `brands`, `units`, `attributes`, `attributes/values`, `warehouses`, `bins`, `stock`, `stock/add`, `stock/movement`, `suppliers`, `purchase-orders`, `purchase-orders/add`, `customers`, `sales-orders`, `sales-orders/add`, `sales-returns`, `pos-sales`, `pos-session`, `pos-registers`, `pos-orders`, `pos-refunds`, `payments`, `expenses`, `accounts`, `journal-entries`, `tenants`, `tenants/register`, `tenants/[id]/edit`, `users`, `permissions`, `user-permissions`, `modules`, `settings`, `reports/purchase-list`, `reports/trial-balance`, `reports/profit-loss`, `reports/cash-flow`, `reports/balance-sheet`, `reports/ledger`.

### 1.4 Business types already supported (enum on `tenants.business_type` & `products.business_type`)

`pharmacy`, `electric`, `electronics`, `fashion`, `furniture`, `bookshop`, `departmental`, `computer`, `clothing`, `footwear`, `cosmetics`, `stationery`, `grocery`, `hardware`, `restaurant`, `cafe`, `supermarket`, `other`.

---

## 2. Gap Analysis — What is NOT Yet Implemented

> Despite 81 tables and 35 controllers, large functional areas are either **table-only** (no model, no controller, no UI) or **partial**.

### 2.1 Critical — Table exists, but NO Model / NO Controller / NO UI

These tables are dead weight today. The system "promises" them but does not deliver:

| Table | Suggested module | What it does | Why it matters |
|-------|------------------|--------------|----------------|
| `prescriptions`, `prescription_items`, `drug_database`, `pharmacy_compliance`, `drug_interactions` | **Pharmacy / Clinical** | Prescription capture, drug-interaction check, controlled-substance tracking | A pharmacy tenant cannot actually dispense against a prescription. |
| `properties`, `property_items` | **Real Estate / Rental** | Property listings, rent/sale, agent commission, attached furniture | Dead code — real-estate tenant cannot function. |
| `bill_of_materials`, `assembly_orders`, `assembly_order_components` | **Manufacturing / BOM / Kitting** | Recipes, multi-level BOM, work orders, by-products | Cannot bill a business that makes things (food, electronics, garments, furniture). |
| `deliveries`, `delivery_items` | **Logistics / Last-mile** | Route planning, driver assignment, POD | Sales-orders have no delivery follow-through. |
| `accounting_integrations`, `accounting_sync_logs` | **External accounting (QuickBooks / Xero / Tally / Zoho)** | Push GL postings out | No automation of external accountants. |
| `ecommerce_integrations`, `ecommerce_sync_mappings` | **Shopify / Woo / Magento / PrestaShop** | Pull orders, push stock | No omnichannel. |
| `abc_categories`, `stock_aging` | **Inventory Analytics** | Pareto, slow-mover, dead-stock | Already on `analytics` page but reports need wiring. |
| `consignment_agreements`, `consignment_stock` | **Consignment / Vendor-managed** | Sell 3rd-party stock, settle later | Common in book and fashion distribution. |
| `mobile_stock_takes`, `mobile_stock_take_items` | **Mobile / Handheld scanner stock-count** | Cycle-count via mobile | Cycle-count workflow missing in UI. |
| `stock_locations` | **Bin-level stock** (table only — model missing) | Where in the warehouse each unit lives | Bins exist as labels, but quantity-in-bin is not tracked. |
| `third_party_logistics` | **3PL partners** | Outsource storage | No controller. |
| `tax_rates` (model missing) | **Multi-rate VAT/SD** | Configurable per-rate | Seeded but CRUD on UI is incomplete. |
| `bank_accounts` (model exists, no controller) | **Bank reconciliation** | Reconcile with bank statement | No UI. |
| `account_reconciliations` (model exists, no controller) | **Bank rec records** | Difference tracking | No UI. |
| `fiscal_periods` (model exists, no controller) | **Year / quarter / month lock** | Period close | No UI. |
| `failed_journal_entries` (controller exists, **no UI**) | **Auto-journal failure queue** | When a sale fails to post a journal, retry from UI | Surface in `journal-entries` page is missing. |
| `pos_hold_orders` (model exists, controller route not confirmed) | **Saved carts** | Resume a held cart later | UI flow unclear. |
| `alerts`, `notifications` (no controllers) | **System alerts engine** | Low-stock, expiry, overdue | Persists but never generated. |
| `audit_logs`, `activity_logs` (no controllers) | **Audit trail / activity feed** | Compliance | No UI to inspect. |
| `tenant_settings` (no controller) | **Per-tenant key-value config** | Receipt printer, currency, locale | UI exists but is read-only. |

### 2.2 Critical — Partial Backend

| Area | Issue |
|------|-------|
| **Purchase Order receive** | No GRN (goods-received-note) endpoint. Stock is never incremented on PO receive. No three-way match (PO ↔ GRN ↔ Supplier bill). |
| **Supplier bills / payables** | `ExpenseController` covers office expenses but not supplier bills. No `supplier_invoices` / `bills` table, no AP aging. |
| **Sales-order → invoice print / e-invoicing** | Print exists in UI but no fiscal/legal invoice format. |
| **Quotations / Pro-forma** | No table, no controller — sales goes straight from quote-in-head to order. |
| **Sales commission** | `sales_orders` has no `commission_amount` / `salesperson_id`. |
| **Multi-warehouse stock transfer** | `stock_movements` supports `transfer_in / transfer_out` but no controller endpoint. |
| **Stocktake / cycle count** | `stocks` has `last_counted_at` but no `stock_counts` / `stock_count_items` table, no variance-adjustment endpoint. |
| **Reorder / Purchase Requisition** | `products.reorder_point` exists but no `purchase_requisitions` automation. |
| **Customer Loyalty** | `customers.loyalty_points` exists but no controller to earn/redeem. |
| **Batch / Expiry workflow** | `batches` exists but no controller. No FEFO enforcement in POS. |
| **Serial-number tracking** | `products.has_serial` exists, no `product_serials` table. |
| **Loyalty / Gift cards / Store credit** | No table, no controller. |
| **Layaway / Installments** | No table, no controller. |
| **Landed cost on purchase** | No `landed_cost` / `shipping_cost_allocation`. COGS is approximated. |
| **Currency / multi-currency** | `tenants.currency` and `accounts.currency` exist but no FX rate table or conversion. |
| **Tax computation (line-level)** | `products.tax_rate` exists; `tax_rates` table exists; but no TaxService to compute per line. |
| **Manufacturing cost rollup** | BOM has no `standard_cost` / `actual_cost`. |

### 2.3 Critical — UI Gaps for Existing Backend

| Backend has | UI has | UI missing |
|-------------|--------|------------|
| Sales orders list, add | `sales-orders`, `sales-orders/add` | detail / show / edit, print A4, e-mail, convert-to-invoice |
| Purchase orders list, add | `purchase-orders`, `purchase-orders/add` | receive-goods, supplier-bill, return, print |
| Customers | `customers` | statement print, credit-note, loyalty, address-book |
| Suppliers | `suppliers` | bill, payment, statement, return |
| Accounting | accounts, journal, expenses, 5 reports | **bank reconciliation**, **fiscal period close**, **failed-journal retry**, **account-ledger** (route exists) |
| POS | pos-sales, pos-session, pos-registers, pos-orders, pos-refunds, pos-hold (missing) | offline mode, scanner, receipt-email, customer-display, weighing-scale |
| Stock | stock, stock/add, stock/movement | **stocktake/cycle-count UI**, **bin-level qty UI**, **batch/expiry UI**, **transfer UI**, **reorder-alert UI** |
| Tenants | tenants, tenants/register, tenants/[id]/edit | **subscription/billing**, **tenant settings** (read-only in current `settings` page), **domain management** |
| Users | users | role / permission matrix edit, password reset, deactivate |
| Payments | payments | **refund UI**, **payment-void**, **reconcile UI** |
| Reports | trial-balance, P&L, balance-sheet, cash-flow, ledger, purchase-list | **stock-valuation**, **sales-by-product/customer/category**, **purchase-by-supplier**, **tax return (VAT/SD)**, **inventory-turnover**, **dead-stock**, **fast-movers**, **profit-margin**, **commission**, **cash-flow forecast**, **AP/AR aging**, **budget vs actual** |
| Audit / Activity / Alerts | none | dedicated pages |

---

## 3. What "Universal Inventory Management" Still Needs

A truly universal system covers: **multi-industry, multi-warehouse, multi-channel, multi-currency, multi-tenant, role-based, full double-entry, end-to-end traceability, offline-capable, and API-first**.

The roadmap below is grouped by industry (Phase A) and then by cross-cutting capability (Phase B).

### PHASE A — Industry coverage (make existing tables functional)

> Each row = deliverable. Estimate = small/medium/large based on backend + UI + testing work.

#### A1. Pharmacy / Clinical
- **Prescription module** — model + controller + UI for `prescriptions`, `prescription_items`, `drug_database`, `pharmacy_compliance`, `drug_interactions`. Trigger interaction warning at POS. Schedule class enforcement (no Schedule II sale without Rx). FEFO + short-dated first. [L]
- **Batch & expiry alerts** — daily job that scans `batches.expiry_date` and writes `alerts`. [M]
- **Controlled-substance register** — append-only log per Schedule-class product. [M]

#### A2. Manufacturing / Kitting
- **BOM module** — model + controller + UI for `bill_of_materials` (multi-level), recursive explosion. [L]
- **Assembly orders** — model + controller + UI for `assembly_orders` and components. Consume components → produce finished. Cost rollup = sum of components. [L]
- **Sub-contracting / job-work** — send raw material out, receive finished. [L]
- **By-products & scrap** — table + UI. [M]
- **Routing / Work centers** — operations, machine, labour time. [L]

#### A3. Restaurant / Cafe (Food & Beverage)
- **Menu / Recipe BOM** — link a "menu item" product to its ingredients. [M]
- **Table management** — tables, sections, floor plan, hold. [M]
- **KOT / Bot** — kitchen/beverage ticket printing. [M]
- **Modifiers** — size, no-onion, etc. [S]
- **Ingredient depletion** — auto-deduct from `stock` when an order is placed. [M]
- **Wastage / spoilage** — already a movement type. Add UI. [S]

#### A4. Real Estate / Rental
- **Properties & rentals module** — controller + UI for `properties`, `property_items`. Booking, deposit, contract, recurring rent invoice, late fee, owner payout, agent commission. [L]
- **Maintenance schedule** — per property, per item. [M]

#### A5. Logistics / Distribution
- **Delivery module** — controller + UI for `deliveries`, `delivery_items`, drivers, vehicles, run-sheets. POD photo & signature. [L]
- **Route planning** — basic (assign-by-zone, capacity). [M]
- **3PL module** — controller + UI for `third_party_logistics`. [M]

#### A6. E-commerce / Omnichannel
- **Channel integration** — controllers for `ecommerce_integrations`, sync engine for orders, stock, products. Start with Shopify + WooCommerce. [L]
- **Webhooks** — incoming order → sales_order; stock push on commit. [L]
- **Multi-channel stock** — channel-level availability, prevent oversell. [M]

#### A7. Services / Subscription
- **Service-type product** — `products.type = 'service'`. Time-based billing, recurring invoices. [M]
- **Subscription / retainer** — `subscriptions` table, auto-invoice. [L]
- **Booking / appointment** — `bookings`, `resources`, calendar. [L]

#### A8. Consignment / Vendor-managed
- Controllers + UI for `consignment_agreements`, `consignment_stock`. Sell first, settle later, commission split. [M]

#### A9. Mobile / Field
- Controller + API for `mobile_stock_takes`, `mobile_stock_take_items`. Offline-first PWA, sync on reconnect. [L]
- Mobile PO approval, mobile sales-rep ordering, mobile delivery proof. [L]

### PHASE B — Cross-cutting enterprise capabilities

#### B1. Multi-warehouse & Bin-level stock
- New table `bin_levels (bin_id, product_id, variation_id, batch_id, qty)` — currently `stock_locations` is the closest but is unused. Add a true bin-level ledger. [L]
- **Stock transfer** between warehouses with `transfer_in` / `transfer_out` movements. [M]
- **Replenishment** (bin → bin, pick-face → reserve). [M]
- **Cross-docking**. [M]

#### B2. Stock-take / Cycle count / Variance
- Tables: `stock_counts`, `stock_count_items`, `stock_count_variances`. [L]
- Methods: full, cycle, blind, spot. [L]
- Approval workflow + auto-adjust via `stock_movements` (type=`adjustment`). [M]
- Variance report, shrinkage report. [S]

#### B3. Procurement completeness
- **GRN** (goods received note) — table + endpoint, updates `stocks` + writes `stock_movement(type=purchase)`. [M]
- **Supplier bills (AP)** — new table `supplier_bills`, `supplier_bill_items`, pay/bill/credit-note. [L]
- **3-way match** — PO ↔ GRN ↔ Bill. [L]
- **Purchase requisitions** — auto-generated from reorder points, manual too. [M]
- **Landed cost** — freight, duty, insurance, allocation per item. [M]
- **Supplier returns / debit notes** — UI for `purchase_returns`. [S]
- **Supplier price lists / contracts** — new table. [M]

#### B4. Sales completeness
- **Quotations / Pro-forma** — new table, convert to SO. [M]
- **Salesperson / commission** — `sales_orders.salesperson_id`, `commission_rate`, `commission_payouts` table. [M]
- **Recurring invoices / subscriptions** (also under A7). [L]
- **Layaway / installments** — `installment_plans`, `installments`. [L]
- **Credit notes / store credit** — extend `sales_returns` to issue store credit; new `customer_credits` table. [M]
- **Loyalty program** — points accrual/redemption rules, tiers, expiry. [M]
- **Gift cards** — table, balance, usage. [M]
- **Discount engine** — coupon codes, BOGO, time-bound, customer-segment. [L]
- **Price lists** — per customer group, per channel, per warehouse. [L]

#### B5. Manufacturing completeness (advanced)
- **Multi-level BOM explosion** (recursive). [M]
- **Work orders & routing** (already half-done with `assembly_orders`). [L]
- **MRP (Material Requirements Planning)** — scheduled job: forecast → production plan → purchase plan. [L]
- **Capacity planning & shop-floor tracking**. [L]
- **Quality control / QC holds**. [M]
- **Subcontracting / outside operations**. [M]
- **Co-products & by-products**. [M]
- **Yield & scrap tracking**. [M]
- **Standard cost vs actual cost rollup**. [M]

#### B6. Inventory analytics & intelligence
- **Stock valuation** (FIFO/LIFO/Weighted-Average/Standard). [M]
- **Stock aging report** (table exists, UI + job missing). [S]
- **ABC analysis** (table exists, run-job + UI missing). [S]
- **Reorder report** — items at/below reorder point. [S]
- **Dead stock report** — no movement in N days. [S]
- **Fast/slow movers**. [S]
- **Inventory turnover / GMROI**. [S]
- **Sales forecasting** (simple moving average, seasonal naive). [M]
- **Demand sensing** from POS history. [L]
- **Gross margin by product / customer / channel**. [S]
- **Promo / Markdown effectiveness**. [M]
- **Price elasticity / optimal price recommendation**. [L]
- **Lead-time analysis & supplier scorecard**. [M]

#### B7. Accounting completeness
- **Bank reconciliation UI** (model exists, no UI). [M]
- **Fiscal period close** with audit trail. [M]
- **Failed-journal retry UI** (controller exists, no UI). [S]
- **Tax return / VAT return / SD return** (Bangladesh & generic). [L]
- **Multi-currency** — `currencies` table, FX rates, revaluation. [L]
- **Cost-center accounting** — `cost_centers` table, allocation rules. [M]
- **Budgeting vs actual**. [L]
- **Cash-flow forecast** (rolls up AR/AP, scheduled payments). [M]
- **Cheque management** (chequebook, post-dated, clearance). [M]
- **Petty cash**. [S]
- **Fixed-asset register & depreciation**. [L]
- **Loan / EMI scheduler**. [M]
- **Inter-company transactions / consolidation** (multi-tenant). [L]
- **External accounting integration** (QuickBooks, Xero, Tally, Zoho) — `accounting_integrations` table exists, no worker. [L]
- **Recurring journal entries** (rent, depreciation). [M]

#### B8. Compliance & governance
- **Audit log UI** (model exists). [S]
- **Activity log UI**. [S]
- **Alerts engine** — auto-generate `alerts` from triggers (low stock, expiry, overdue, failed journal, payment due). [M]
- **Notifications** — in-app, email, SMS, push. Wire `notifications` table to UI bell. [M]
- **GDPR / data-privacy** — export personal data, delete request. [M]
- **Document attachments** — per-record file upload (PO PDF, bill scan, contract). [M]
- **E-signature / approval workflows** — generic, multi-step. [L]
- **Maker-checker** (dual control) for high-value ops. [L]
- **Tax IDs** (TIN/BIN/VAT) on each tenant + invoices. Already collected. Make mandatory for invoices. [S]
- **e-Invoice / fiscal printer** integration per country. [L]
- **Subscription billing** for SaaS itself (Stripe, bKash). [M]
- **Role-based access control** (RBAC) matrix UI. [M]
- **Row-level security by tenant/warehouse/region**. [M]
- **Data retention / archive policy**. [M]

#### B9. Customer / Supplier portal
- Self-service portal: order history, invoice download, statement, payment, return-request. [L]
- Supplier portal: PO inbox, ASN, invoice upload, payment status. [L]

#### B10. Platform & engineering
- **API versioning** — already at `v1`. Add `v2` for breaking changes. [S]
- **OpenAPI / Swagger docs** from controllers. [M]
- **Webhook out** — notify external systems on events. [M]
- **Rate limiting & quota** per tenant. [S]
- **Job queue** — already has Laravel queues; wire long-running tasks (email, integration sync, MRP, alerts). [M]
- **Caching** — Redis for hot lists. [S]
- **Event sourcing** (optional) for audit-heavy tenants. [L]
- **Multi-database** per tenant for high-scale. [L]
- **Read replicas** for reports. [M]
- **Soft delete** consistency — many tables still hard-delete (`customers` recently got soft-deletes; propagate). [S]
- **Internationalization (i18n)** — date, currency, number format per tenant locale. [M]
- **Right-to-left** UI for Arabic/Hebrew. [M]
- **PDF / Excel** generation (already in UI; expose on server too). [S]
- **Barcode label printing** (ZPL/EPL). [M]
- **Receipt printer** (ESC/POS, 80mm/58mm). Already in UI per recent commits; verify portability. [S]
- **Email / SMS** channels — provider abstraction (SES, Twilio, SSL Wireless). [M]
- **Backup & restore** tooling. [M]
- **Observability** — logs, metrics, traces (Laravel Telescope + Sentry + Prometheus). [M]
- **Feature flags** per tenant per module. [M]
- **White-label / theme** per tenant. [S]
- **Mobile app** (React Native or Flutter) consuming the same API. [L]
- **Offline POS** (PWA with IndexedDB queue). [L]
- **AI assistant** — natural-language inventory query, demand forecast, anomaly detection. [L]

---

## 4. Recommended Execution Order (phased, dependency-aware)

> Each phase is a "release"; the existing UI can host the new pages incrementally.

| Phase | Goal | Includes | Approx effort |
|-------|------|----------|---------------|
| **P0 — Quick wins** | Surface what already exists | failed-journal UI, audit-log UI, bank-account UI, fiscal-period UI, account-reconciliation UI, tax-rates UI, bins-stocking, stock-transfer, reorder-report, dead-stock report, product-search, global-search, password-reset | 2–3 weeks |
| **P1 — Sales/Procurement core** | Close the loop | Quotations, GRN, supplier-bills, sales-person/commission, 3-way match, landed-cost | 4–6 weeks |
| **P2 — Stock accuracy** | Bin-level reality | Bin stock ledger, stock-count/cycle-count, FEFO enforcement, batch/expiry alerts engine, mobile-stocktake | 4–6 weeks |
| **P3 — Accounting finish** | Books that balance | Bank-recon UI, period close, multi-currency, budget vs actual, recurring journals, e-invoice | 6–8 weeks |
| **P4 — Manufacturing** | Make things | BOM, assembly, MRP, work orders, sub-contracting, by-products | 6–8 weeks |
| **P5 — Industry packs** | Domain depth | Pharmacy Rx + interaction; Restaurant KOT + recipe; Real-estate rental; Loyalty; Gift cards; Layaway; Subscriptions | 8–12 weeks |
| **P6 — Channels** | Sell everywhere | Shopify/Woo integration, 3PL module, consignment, e-commerce sync engine | 6–8 weeks |
| **P7 — Logistics & delivery** | Move goods | Delivery module, route planning, POD, driver app | 4–6 weeks |
| **P8 — Analytics & AI** | Decide better | Stock-valuation, turnover, dead-stock, margin reports, forecasting, anomaly detection | 4–6 weeks |
| **P9 — Platform** | Operate at scale | RBAC matrix, observability, webhooks, queues, OpenAPI, i18n, white-label | ongoing |

---

## 5. File / Module Touchpoints (for downstream implementation)

When work begins, the work-list should be created in this order (these are the files most likely to be created or extended first):

**Backend (Laravel — `inventory-api`):**
- New: `app/Models/Prescription.php`, `BillOfMaterial.php`, `AssemblyOrder.php`, `Delivery.php`, `Property.php`, `BankAccount.php`, `FiscalPeriod.php`, `TaxRate.php`, `StockCount.php`, `SupplierBill.php`, `PurchaseRequisition.php`, `Quotation.php`, `Salesperson.php`, `CommissionRule.php`, `Currency.php`, `FxRate.php`, `CostCenter.php`, `Budget.php`, `LoyaltyRule.php`, `GiftCard.php`, `Subscription.php`, `Booking.php`, `ProductSerial.php`, `BinLevel.php`, `WarehouseTransfer.php`, `CustomerCredit.php`, `Coupon.php`, `PriceList.php`, `RecurringInvoice.php`, `ProductKitItem.php` (joins already exist via `bill_of_materials`).
- New controllers: `PrescriptionController`, `BillOfMaterialController`, `AssemblyOrderController`, `DeliveryController`, `PropertyController`, `BankAccountController`, `FiscalPeriodController`, `TaxRateController`, `StockCountController`, `SupplierBillController`, `PurchaseRequisitionController`, `QuotationController`, `SalespersonController`, `CommissionController`, `CurrencyController`, `CostCenterController`, `BudgetController`, `LoyaltyController`, `GiftCardController`, `SubscriptionController`, `BookingController`, `ProductSerialController`, `BinLevelController`, `WarehouseTransferController`, `CustomerCreditController`, `CouponController`, `PriceListController`, `RecurringInvoiceController`, `NotificationController`, `AlertController`, `AuditLogController`, `ActivityLogController`, `ReportController` (consolidate reports), `IntegrationController` (Shopify/Woo), `OpenApiController` (Swagger).
- New services: `MrpService`, `ReorderService`, `FefoService`, `PriceListService`, `DiscountService`, `CommissionService`, `TaxService`, `FxService`, `BudgetService`, `RecurringInvoiceService`, `BankReconciliationService`, `PeriodCloseService`, `EcommerceSyncService`, `AccountingSyncService`, `LoyaltyService`, `GiftCardService`, `BarcodeService` (server-side label render).
- New jobs: `GenerateAlertsJob`, `ReorderCheckJob`, `ExpiryAlertJob`, `OverdueInvoiceJob`, `FailedJournalRetryJob`, `RecurringInvoiceJob`, `EcommerceSyncJob`, `AccountingSyncJob`, `AbcAnalysisJob`, `StockAgingJob`, `CurrencyRevaluationJob`.
- New routes in `routes/api.php`, `routes/web.php`, new files `routes/api/prescriptions.php`, `routes/api/manufacturing.php`, `routes/api/reports.php`, etc.

**Frontend (Next.js — `inventory-ui`):**
- New pages matching each module (e.g. `app/(protected)/prescriptions`, `app/(protected)/manufacturing/bom`, `app/(protected)/manufacturing/work-orders`, `app/(protected)/delivery`, `app/(protected)/properties`, `app/(protected)/banking`, `app/(protected)/banking/reconciliation`, `app/(protected)/fiscal-periods`, `app/(protected)/stock-counts`, `app/(protected)/supplier-bills`, `app/(protected)/quotations`, `app/(protected)/salespeople`, `app/(protected)/loyalty`, `app/(protected)/gift-cards`, `app/(protected)/subscriptions`, `app/(protected)/currencies`, `app/(protected)/cost-centers`, `app/(protected)/budgets`, `app/(protected)/price-lists`, `app/(protected)/coupons`, `app/(protected)/integrations/shopify`, `app/(protected)/integrations/woocommerce`, `app/(protected)/integrations/accounting`, `app/(protected)/audit-logs`, `app/(protected)/activity-logs`, `app/(protected)/alerts`, `app/(protected)/notifications`, `app/(protected)/mobile-stocktake`, `app/(protected)/delivery/manifest`).
- New components: `BinPicker`, `BatchPicker`, `SerialNumberInput`, `BarcodeLabel`, `ReceiptPreview`, `KotPrinter`, `RouteMap`, `TreeOfAccounts`, `TrialBalanceTable`, `StockAgingChart`, `AbcChart`, `ForecastChart`, `MarginChart`, `CommissionCalculator`, `BarcodeScanner` (already exists in places — confirm and reuse).
- New Zustand stores: `useAlertsStore`, `useNotificationsStore`, `useBarcodeScannerStore`, `usePosCartStore` (if not present).
- New services: one `.ts` per controller.

**Documentation:**
- `inventory-api/docs/openapi.yaml` (auto-generated)
- `inventory-ui/docs/MODULE-GUIDE.md`
- `docs/UPCOMMING_DEV_ITEM.md` — this file, kept in repo, updated each release.

---

## 6. Verification Strategy (how to know a release is done)

For every module added:
1. `php artisan test` (Pest) — unit + feature coverage for the controller, service, job.
2. `php artisan migrate:fresh --seed` — runs all 43 migrations cleanly with a representative seed.
3. `php artisan route:list` — verify the new routes show.
4. Manual smoke via Postman/Insomnia for every endpoint.
5. UI walkthrough: list, add, edit, delete, print, export.
6. Permission check: a tenant_user without `view-X` permission gets 403.
7. Multi-tenant check: tenant A cannot see tenant B's rows.
8. Accounting check: every `reference_type` you create posts a balanced journal entry; the failed-journal queue stays empty in happy path.
9. Stock check: stock-on-hand never goes negative unless `allow_backorder` true.
10. Performance check: 10k products list page < 500 ms p95.

---

## 7. Open Decisions to Make Before Implementation

These are choices the user should make, surfaced here for clarity:

1. **Currency strategy** — single-currency-per-tenant (current) vs. multi-currency with FX (needed for export-driven businesses).
2. **Tenant isolation** — single-DB shared schema (current `stancl/tenancy` setup) vs. multi-DB per tenant (heavier ops).
3. **Costing method** — pick one default (Weighted Average is industry-standard default; FIFO/LIFO as settings).
4. **MRP target** — start with reorder-point replenishment, leave true MRP for a later phase?
5. **Mobile strategy** — PWA (cheaper, slower) vs. React Native / Flutter (faster, costlier)?
6. **Integration priority** — Shopify vs. WooCommerce vs. Tally vs. QuickBooks first?
7. **Multi-language** — start with English + Bangla (current market), or plan full i18n?
8. **Pricing model of the SaaS itself** — per-user, per-warehouse, per-product, or flat? (data model already supports caps in `tenants.max_*`).

---

*This file is the single source of truth for "what to build next." Each release phase should tick off items and append a one-line changelog at the bottom.*
