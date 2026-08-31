# Storefront Site Search — Performance & Architecture Plan

## Goal
Make search on the storefront (header search box + `/store/search` results page) fast, relevant, and scalable — for products today, and easily extensible to categories/brands/content later.

## Current State (audit)

| Piece | Status | Problem |
|---|---|---|
| `products` table | Has a MySQL `FULLTEXT` index on `name, description` (`products_name_description_fulltext`) | **Not used at all.** |
| `StorefrontCatalogService::visibleProducts()` search filter | `WHERE name LIKE '%term%' OR slug LIKE '%term%'` | Leading-wildcard `LIKE '%...%'` can't use any index → full table scan; gets worse as catalog grows. No relevance ranking (results ordered by whatever `sort` param says, not by match quality). |
| `/store/search` page | Calls `getProducts({ search })`, then sorts client-side | Every keystroke-driven navigation re-hits the DB with an unindexed scan; no caching. |
| Header `SearchBar` (autocomplete dropdown) | Filters `PRODUCTS` from `lib/storefront/mock-data.ts` | **Not wired to the real API at all** — suggestions shown to users don't reflect the actual catalog. |
| Debouncing / request cancellation | None | Typing fast fires overlapping requests; no `AbortController`, no debounce. |
| Search analytics | None | No way to see what customers search for / zero-result queries to improve the catalog. |
| Rate limiting | None on the search endpoint specifically | Open to scripted scraping/DoS via repeated wildcard-LIKE queries (the most expensive query pattern in the app). |
| Scope of "search" | Products only | Can't search categories, brands, or CMS/help content from one box. |

## Phase 0 — Quick wins (no new infra, biggest ROI first)
1. **Use the existing FULLTEXT index** instead of `LIKE '%term%'`:
   ```php
   $query->whereRaw(
       "MATCH(products.name, products.description) AGAINST (? IN BOOLEAN MODE)",
       [$booleanModeTerm]
   );
   ```
   - Build `$booleanModeTerm` by appending `*` to each word (prefix matching, e.g. `iphone case` → `+iphone* +case*`) so partial words still match.
   - Keep a `LIKE` fallback for very short terms (FULLTEXT ignores words shorter than `innodb_ft_min_token_size`, default 3 chars) and for `slug` exact/prefix lookups.
   - Order by MySQL's relevance score (`MATCH(...) AGAINST(...)` in the `SELECT`) when `sort=relevance`, instead of just name/date.
2. **Wire the header `SearchBar` to the real API** (remove the mock-data dependency) via a lightweight `/api/v1/storefront/search/suggest` endpoint (see Phase 1) so autocomplete reflects real inventory.
3. **Debounce + cancel in-flight requests** client-side (250–300ms debounce, `AbortController` per keystroke) on both the header search box and the `/store/search` page.
4. **Select only needed columns** for suggestions (id, name, slug, thumbnail, price) instead of the full product-mapping payload used for listing pages — smaller payload, faster serialization.
5. **Add a composite index** on `(status, business_type_id)` if not already covered, so the FULLTEXT match still filters cheaply on active/visible products.

## Phase 1 — Dedicated suggest/autocomplete endpoint
- New endpoint: `GET /api/v1/storefront/search/suggest?q=...`
  - Returns a small, fast payload grouped by type: `{ products: [...top 5], categories: [...top 3], brands: [...top 3] }`.
  - Backed by the same FULLTEXT query as Phase 0, `LIMIT` tightly (5–8 rows total), cached briefly (see caching below).
  - Categories/brands matched via simple indexed `LIKE 'term%'` (prefix) since those tables are small.
- Full results page (`/store/search`) keeps using `/storefront/products?search=...` (already paginated), now powered by the FULLTEXT query + relevance sort from Phase 0.
- Client: keyboard navigation (↑/↓/Enter) in the suggestion dropdown, highlight the matched substring in each suggestion, "View all results for “x”" link at the bottom.

## Phase 2 — Caching & relevance tuning
- **Cache popular queries** (Redis, `search:{tenant}:{normalized-query}:{page}`) for 2–5 minutes — search terms follow a long-tail/Pareto distribution, so a small cache absorbs a large share of traffic.
- **Weighted relevance**: boost `name` matches over `description` matches (MySQL `MATCH(name) AGAINST(...) * 2 + MATCH(description) AGAINST(...)`), and add small boosts for `is_featured` / `is_bestseller` / in-stock products so promoted/available items surface first on ties.
- **Typo tolerance**: MySQL FULLTEXT has none built-in. Cheap partial mitigation: also try a `SOUNDEX`/Levenshtein fallback only when the primary query returns 0 rows (rare path, so cost is acceptable).
- **Search analytics table** (`storefront_search_logs`: tenant_id, query, results_count, created_at) written asynchronously (queued job, not on the request path) — powers a "zero-result queries" report to fix catalog gaps and a "trending searches" widget (replacing the current hardcoded `POPULAR_SEARCHES` mock list).
- **Rate limit** the search/suggest endpoints (`throttle:search` middleware, e.g. 30 req/min per IP) since wildcard/text queries are the most expensive read path in the app.

## Phase 3 — Scale-out (only if/when catalog size or feature needs outgrow MySQL FULLTEXT)
Triggers to revisit: catalog > ~200k products per tenant, need for typo-tolerance/synonyms/faceted search-as-you-type at scale, or need to search across products + CMS pages + orders in one ranked result set.

- Adopt a dedicated search engine — **Meilisearch or Typesense** (self-hosted, simple ops, sub-50ms typo-tolerant search) are the recommended default over Elasticsearch (heavier to operate) or Algolia (hosted cost) for this app's scale.
- Index sync via Laravel model observers → queued jobs (`ProductSaved`, `ProductDeleted`) push incremental updates; a scheduled full re-index job as a safety net.
- Storefront search/suggest endpoints switch to querying the search engine instead of MySQL; MySQL remains the source of truth.
- Multi-tenant isolation: one index per tenant (or a `tenant_id` filter attribute), mirroring existing tenant-scoping conventions in this codebase.

## Non-goals (out of scope for this plan)
- Searching order history / customer PII from the public storefront box.
- Voice search / image search.
- Cross-tenant global search (each storefront only searches its own active tenant's catalog, consistent with existing tenant isolation).

## Suggested implementation order
1. Phase 0 items 1–3 (FULLTEXT + real API wiring + debounce) — highest impact, lowest effort, no schema/infra changes.
2. Phase 1 suggest endpoint.
3. Phase 2 caching + analytics.
4. Phase 3 only when a real scale trigger is hit.
