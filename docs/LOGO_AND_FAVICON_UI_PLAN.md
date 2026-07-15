# Logo & Favicon — Upload & Preview UI/UX Plan

> **For:** Branding > Logo & Favicon management (admin/back-office, `inventory-ui`)
> **Scope:** Upload light logo, dark logo, favicon with live previews replacing the current `PageStub` placeholder.
> **Fields:** `light_logo`, `dark_logo`, `favicon` (file uploads) + existing URLs from DB
> **Status:** Design plan only — no implementation yet.

This plan follows the **existing admin conventions** already used across Brand/Category/Product pages and the Hero Slider page, so the new Logo screen feels native:

- Dense, utilitarian layout — tight padding (`p-1.5`–`p-4`), small text (`text-sm`/`text-xs`).
- Card style: `bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700`.
- Inputs/buttons: `px-3 py-1.5 text-sm rounded`.
- Reuses the visual language of the Hero Slider dropzone (dashed border, drag-active highlight, progress bar, preview thumbnail) rather than inventing a new upload look.
- Toasts via the existing SweetAlert2 `notifications`/`notify` wrapper (`notify.error`, `notify.success`) — no new toast system.
- Image CDN URL resolution via existing `resolveImageUrl()` helper.

---

## 1. Page Layout Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Image icon]  Logo & Favicon                         [Save Changes] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────┐  ┌────────────────────────────┐    │
│  │  Light Logo                │  │  Dark Logo                 │    │
│  │                            │  │                            │    │
│  │  ┌──────────────────────┐  │  │  ┌──────────────────────┐  │    │
│  │  │   Drop zone          │  │  │  │   Drop zone          │  │    │
│  │  │   (dashed border)    │  │  │  │   (dashed border)    │  │    │
│  │  │   Drag or click      │  │  │  │   Drag or click      │  │    │
│  │  └──────────────────────┘  │  │  └──────────────────────┘  │    │
│  │                            │  │                            │    │
│  │  ┌──────────────────────┐  │  │  ┌──────────────────────┐  │    │
│  │  │  [LOGO] Store        │  │  │  │  [LOGO] Store        │  │    │
│  │  │  white header strip  │  │  │  │  dark header strip   │  │    │
│  │  └──────────────────────┘  │  │  └──────────────────────┘  │    │
│  │  [Remove]                  │  │  [Remove]                  │    │
│  │  Recommended: 200x60 PNG   │  │  Recommended: 200x60 PNG  │    │
│  └────────────────────────────┘  └────────────────────────────┘    │
│                                                                     │
│  ┌────────────────────────────┐  ┌────────────────────────────┐    │
│  │  Favicon                   │  │  Live Preview              │    │
│  │                            │  │                            │    │
│  │  ┌──────────────────────┐  │  │  Tab: [fav] UIMS Store  × │    │
│  │  │   Drop zone          │  │  │                            │    │
│  │  │   (dashed border)    │  │  │  [LOGO] Store  (light)    │    │
│  │  └──────────────────────┘  │  │                            │    │
│  │                            │  │  [LOGO] Store  (dark)     │    │
│  │  Tab mockup:               │  │                            │    │
│  │  ┌──────────────────────┐  │  │  ★ UIMS Store [favicon]   │    │
│  │  │ [fav] UIMS Store   × │  │  │  (bookmark style)         │    │
│  │  └──────────────────────┘  │  │                            │    │
│  │                            │  └────────────────────────────┘    │
│  │  [16] [32] [48] [256]     │                                     │
│  │  [Remove]                  │                                     │
│  │  Recommended: 512px PNG   │                                     │
│  └────────────────────────────┘                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Single page at `app/(protected)/ecommerce/appearance/logo/page.tsx`, replacing the current `PageStub` placeholder. **No CRUD list** — this is a settings page with three upload slots and live previews, not a collection manager like Hero Slider or Brands.

---

## 2. Component Tree

```
LogoPage
├── PageHeader
│   ├── Icon: Image (lucide-react)
│   ├── Title: "Logo & Favicon"
│   └── SaveButton (disabled if !dirty || saving)
│
├── LogoGrid (grid-cols-2 gap-4)
│   ├── LogoUploadCard (variant="light")
│   │   ├── DropZone (drag/click)
│   │   ├── LogoPreview (bg="white", mock header strip)
│   │   └── RemoveButton
│   │
│   └── LogoUploadCard (variant="dark")
│       ├── DropZone (drag/click)
│       ├── LogoPreview (bg="slate-900", mock header strip)
│       └── RemoveButton
│
├── BottomGrid (grid-cols-2 gap-4)
│   ├── FaviconUploadCard
│   │   ├── DropZone (drag/click)
│   │   ├── FaviconPreview
│   │   │   ├── BrowserTabMock (favicon in styled tab strip)
│   │   │   └── SizePills ([16] [32] [48] [256])
│   │   └── RemoveButton
│   │
│   └── LivePreviewPanel
│       ├── TabBarMock (favicon + page title)
│       ├── LightHeaderMock (logo on white bg)
│       ├── DarkHeaderMock (logo on dark bg)
│       └── BookmarkMock (favicon + star icon)
│
└── LoadingOverlay (when saving)
```

---

## 3. Drop Zone Design

**Pattern:** Reuse Hero Slider drop zone logic directly — same classes, same drag-active state, same icon.

### 3.1 Visual States

```
│  ┌─ Idle ──────────────────────────────────────────────────────┐  │
│  │  border-2 border-dashed border-gray-300 dark:border-gray-600 │  │
│  │  hover:border-gray-400 rounded h-24 cursor-pointer          │  │
│  │                                                             │  │
│  │          [ImUpload icon 24px, text-gray-400]                │  │
│  │          Drop an image or click to browse                   │  │
│  │          JPEG, PNG, WebP, SVG · Max 2MB                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─ Drag Active ──────────────────────────────────────────────┐   │
│  │  border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20       │  │
│  │  border-2 border-dashed rounded h-24 cursor-pointer         │  │
│  │                                                             │  │
│  │         [ImUpload icon 24px, text-indigo-500]               │  │
│  │         Release to upload                                   │  │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─ After Upload (has file) ──────────────────────────────────┐   │
│  │  hidden — replaced by preview section below                 │   │
│  └─────────────────────────────────────────────────────────────┘   │
```

### 3.2 File Constraints per Slot

| Slot | Accepted Formats | Max Size | MIME Check |
|------|-----------------|----------|------------|
| Light Logo | `.jpg,.jpeg,.png,.webp,.svg` | 2 MB | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml` |
| Dark Logo | `.jpg,.jpeg,.png,.webp,.svg` | 2 MB | same |
| Favicon | `.png,.ico` | 500 KB | `image/png`, `image/x-icon`, `image/vnd.microsoft.icon` |

### 3.3 Shared Drop Zone Implementation (pseudo)

```tsx
const DropZone = ({
  file,
  filePreview,
  accept,
  maxSize,
  onFileSelect,
}: DropZoneProps) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null) => {
    if (!f) return;
    const allowed = accept.split(',').map(s => s.trim());
    if (!allowed.some(ext => f.name.endsWith(ext.replace('.', '')))) {
      notify.error(`Only ${accept} files are allowed`);
      return;
    }
    if (f.size > maxSize) {
      notify.error(`File must be under ${Math.round(maxSize / 1024 / 1024 * 10) / 10}MB`);
      return;
    }
    onFileSelect(f);
  };

  if (filePreview) return null; // hide when file is selected

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFile(e.dataTransfer.files?.[0] || null); }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex items-center justify-center h-24 rounded border-2 border-dashed transition-colors cursor-pointer',
        dragActive
          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
      )}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={e => handleFile(e.target.files?.[0] || null)} className="hidden" />
      <div className="text-center">
        <ImUpload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {dragActive ? 'Release to upload' : 'Drop an image or click to browse'}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {accept.split(',').join(', ').toUpperCase()} &middot; Max {Math.round(maxSize / 1024)}KB
        </p>
      </div>
    </div>
  );
};
```

---

## 4. Preview Section Design

### 4.1 Logo Previews — Mock Header Strip

Each logo card shows a simulated header once a file is selected (or an existing URL exists):

```
┌─ Light Logo Preview ───────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [LOGO]  Store Name          Cart  Login  ...            │  │  ← bg-white, border border-gray-200
│  └──────────────────────────────────────────────────────────┘  │
│  [Remove]                                                      │
└─────────────────────────────────────────────────────────────────┘

┌─ Dark Logo Preview ────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  [LOGO]  Store Name          Cart  Login  ...            │  │  ← bg-slate-900, text-gray-100
│  └──────────────────────────────────────────────────────────┘  │
│  [Remove]                                                      │
└─────────────────────────────────────────────────────────────────┘
```

- Logo image: `max-h-8 object-contain` (constrains height, preserves aspect ratio)
- Header strip: `h-12 rounded border` with flex layout
- Logo area: left-aligned with `ml-3`, store name text next to it
- Nav items: right-aligned, grayed-out text for visual balance

**Empty state (no logo):**
```
│  ┌─ Placeholder ───────────────────────────────────────────┐   │
│  │          [ImageIcon, text-gray-300]                       │  │
│  │          No logo uploaded                                 │  │
│  └──────────────────────────────────────────────────────────┘   │
```
- Uses `ImageIcon` from lucide-react, same as existing empty states

### 4.2 Favicon Previews

#### Tab Mockup

```
│  ┌─ Tab Mockup ────────────────────────────────────────────┐   │
│  │  ┌──────────────────────────────────────────────┐  ...  │   │
│  │  │  [favicon]  UIMS Store — Best Online Shop  × │       │   │
│  │  └──────────────────────────────────────────────┘       │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  page content area (gray placeholder)              │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
```

- Active tab: `bg-white rounded-t border border-gray-300 border-b-white` (simulated browser tab)
- Tab text: `text-sm text-gray-700 truncate max-w-[250px]`
- Favicon: `w-4 h-4 object-contain` in the tab
- Close button: `X` icon at right
- Content area: `bg-gray-100 h-20 rounded-b border border-t-0`

#### Size Pills

```
│  [16×16]  [32×32]  [48×48]  [256×256]
```

- Each pill: `inline-block px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border`
- Renders the uploaded favicon at actual pixel dimensions inside each pill
- Purpose: confirm the favicon looks good at all common sizes

### 4.3 Live Preview Panel (Right Side)

Shows all three assets in context together:

```
┌─ Live Preview ──────────────────────────────────────────────┐
│  ┌─ Browser Tab ──────────────────────────────────────────┐ │
│  │  [favicon]  UIMS Store — Best Online Shop  ×           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌─ Light Header ────────────────────────────────────────┐  │
│  │  [LOGO]  Store Name              Cart  Login          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Dark Header ─────────────────────────────────────────┐  │
│  │  [LOGO]  Store Name              Cart  Login          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ Bookmark ────────────────────────────────────────────┐  │
│  │  ★ UIMS Store                                        │  │
│  │  [favicon]  Best online shopping in Bangladesh        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- Wrapper: fixed height, scrollable if needed
- Each subsection separated by `mb-3`
- Bookmarks use a simple card with favicon + store details, mimicking Google Chrome bookmark appearance

---

## 5. State Management

### 5.1 Form State Shape

```ts
type BrandingForm = {
  light_logo: File | null;
  light_logo_preview: string | null;   // local blob URL
  light_logo_url: string | null;       // existing URL from API

  dark_logo: File | null;
  dark_logo_preview: string | null;
  dark_logo_url: string | null;

  favicon: File | null;
  favicon_preview: string | null;
  favicon_url: string | null;
};
```

### 5.2 Additional Page State

| State | Type | Default | Purpose |
|-------|------|---------|---------|
| `loading` | `boolean` | `true` | Initial API fetch |
| `saving` | `boolean` | `false` | Disable save button during upload |
| `dirty` | `boolean` (derived) | `false` | `true` if any file field changed from initial |
| `errors` | `Record<string, string>` | `{}` | Per-field validation errors from API |

### 5.3 Derived State Logic

```ts
// dirty = true when any file has been changed
const dirty = form.light_logo !== null
  || form.dark_logo !== null
  || form.favicon !== null;

// canRemove = true when there is an existing URL AND no new file selected
const canRemoveLightLogo = initialLightLogoUrl !== null && form.light_logo === null;
const canRemoveDarkLogo = initialDarkLogoUrl !== null && form.dark_logo === null;
const canRemoveFavicon = initialFaviconUrl !== null && form.favicon === null;
```

### 5.4 Lifecycle

```
Page Mount
  │
  ├─ loading = true
  ├─ GET /api/v1/ecommerce/branding
  │
  ├─ success → populate form.light_logo_url, dark_logo_url, favicon_url
  │           → set initial* refs for dirty comparison
  │           → loading = false
  │
  └─ error   → notify.error, loading = false

User selects file
  │
  ├─ revoke previous blob URL (if any)
  ├─ URL.createObjectURL(file) → set *_preview
  ├─ set form.*_logo = file → dirty = true

User clicks Remove
  │
  ├─ revoke blob URL
  ├─ set *_preview = null, *_url = null → dirty = true

User clicks Save
  │
  ├─ saving = true
  ├─ POST FormData(multipart) to /api/v1/ecommerce/branding
  │   ├─ if light_logo: append('light_logo', form.light_logo)
  │   ├─ if dark_logo: append('dark_logo', form.dark_logo)
  │   └─ if favicon: append('favicon', form.favicon)
  │
  ├─ success → notify.success('Saved')
  │           → refetch from API (confirm server URLs)
  │           → reset dirty = false, files = null
  │           → saving = false
  │
  └─ error   → notify.error(server message)
              → saving = false

Component Unmount
  │
  └─ revoke all blob URLs (light_logo_preview, dark_logo_preview, favicon_preview)
```

---

## 6. API Interaction

### 6.1 Service: `services/brandingService.ts`

```ts
import type { AxiosProgressEvent } from 'axios';
import apiClient from './api-client';  // or use the existing API setup

export interface BrandingResponse {
  light_logo_url: string | null;
  dark_logo_url: string | null;
  favicon_url: string | null;
}

class BrandingService {
  async get(): Promise<BrandingResponse> {
    const { data } = await apiClient.get('/v1/ecommerce/branding');
    return data.data;
  }

  async update(
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<BrandingResponse> {
    const { data } = await apiClient.post('/v1/ecommerce/branding', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    });
    return data.data;
  }

  async remove(type: 'light_logo' | 'dark_logo' | 'favicon'): Promise<BrandingResponse> {
    const { data } = await apiClient.delete(`/v1/ecommerce/branding/${type}`);
    return data.data;
  }
}

const brandingService = new BrandingService();
export default brandingService;
```

### 6.2 Backend Endpoints (Laravel, to be created)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/ecommerce/branding` | Fetch current logo/favicon URLs |
| `POST` | `/api/v1/ecommerce/branding` | Upload/replace logos + favicon (`multipart/form-data`) |
| `DELETE` | `/api/v1/ecommerce/branding/{type}` | Remove a single asset (`light_logo`, `dark_logo`, `favicon`) |

### 6.3 API Response Shape

```json
{
  "data": {
    "light_logo_url": "https://backend.test/storage/uploads/branding/light-logo.webp",
    "dark_logo_url": "https://backend.test/storage/uploads/branding/dark-logo.webp",
    "favicon_url": "https://backend.test/storage/uploads/branding/favicon.png"
  }
}
```

URLs are full backend URLs (absolute via `Storage::url()`), resolved client-side by `resolveImageUrl()`.

---

## 7. Image URL Resolution

Use the same `resolveImageUrl()` helper pattern as Hero Slider (or extract it to a shared utility):

```ts
const resolveImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '');
  if (!baseUrl) return url;

  return `${baseUrl}${url.startsWith('/') ? url : '/' + url}`;
};
```

For logo previews, use resolved URL. For local previews (newly selected files), use blob URL directly.

---

## 8. Edge Cases & Behavior Matrix

| Scenario | Expected Behavior |
|----------|-------------------|
| **Page loads, no assets in DB** | All three cards show drop zones. Previews show "No logo uploaded" placeholder. Save button disabled. |
| **Page loads, assets exist** | Drop zones hidden; previews shown with resolved image URLs. Save button disabled (no changes yet). |
| **User drops invalid file type** | Toast `notify.error('Only JPEG, PNG, WebP, and SVG files are allowed')`. File ignored, no state change. |
| **User drops oversized file** | Toast `notify.error('File must be under 2MB')`. File ignored, no state change. |
| **User replaces existing logo** | Drop zone re-appears (file set to null), preview switches to new blob. Dirty becomes true. |
| **User selects new file while one exists** | `URL.revokeObjectURL()` on previous blob, create new blob. Preview updates. |
| **User clicks Remove** | Sets `*_logo` to null, `*_preview` to null, `*_url` to null. Drop zone re-appears. Dirty = true. Save enabled. |
| **Save clicked, no changes** | Button is disabled via `dirty` flag — cannot click. |
| **Save clicked, upload in progress** | Shows upload progress bar (matching hero slider pattern). Button shows spinner + "Saving...". All inputs disabled. |
| **Save success** | Toast `notify.success('Logo & favicon saved successfully')`. Refetch API to confirm server URLs. Reset dirty/files. |
| **Save fails (validation)** | Toast `notify.error('Validation error', serverErrors)` using standard API error unwrap pattern. Files remain in state. |
| **Save fails (network)** | Toast `notify.error('Failed to save. Please try again.')`. |
| **Component unmounts** | All `URL.createObjectURL()` blobs revoked in cleanup `useEffect` to prevent memory leaks. |
| **Multiple rapid file changes** | Each new file selection revokes the previous blob before creating a new one. |

---

## 9. File Inventory

| File | Action | Description |
|------|--------|-------------|
| `app/(protected)/ecommerce/appearance/logo/page.tsx` | **Replace** | Remove `PageStub` placeholder, add full upload/preview implementation |
| `services/brandingService.ts` | **Create** | `BrandingService` class with `get()`, `update()`, `remove()` methods |
| `types/api.types.ts` | **Append** | Add `BrandingAsset` and `BrandingResponse` interfaces |
| (Laravel) `routes/route/ecommerce.php` | **Append** | Add branding route group (`GET`, `POST`, `DELETE`) |
| (Laravel) `app/Http/Controllers/Api/Ecommerce/BrandingController.php` | **Create** | Controller for branding CRUD operations |
| (Laravel) `app/Http/Resources/Ecommerce/BrandingResource.php` | **Create** | API resource transforming branding model to JSON |

---

## 10. Icons

| Icon | Source | Usage |
|------|--------|-------|
| `Image` | `lucide-react` | Page header icon |
| `ImUpload` | `react-icons/im` | Drop zone content icon |
| `Loader2` | `lucide-react` | Save button spinner |
| `X` | `lucide-react` | Remove button on previews / tab close mockup |
| `Trash2` | `lucide-react` | Alternative remove button icon |
| `Star` | `lucide-react` | Bookmark mockup icon |
| `Monitor` | `lucide-react` | Live preview section header icon |

---

## 11. Styling Convention Reference

| Element | Classes |
|---------|---------|
| Page container | `space-y-6` |
| Card | `bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 p-4` |
| Card title | `text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3` |
| Label | `block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1` |
| Input | `w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500` |
| Primary button | `px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors` |
| Secondary button | `px-4 py-1.5 bg-gray-500 text-white text-sm font-medium rounded hover:bg-gray-600 transition-colors` |
| Button disabled | `disabled:bg-gray-400 disabled:cursor-not-allowed` |
| Grid | `grid grid-cols-1 lg:grid-cols-2 gap-4` |
| Help text | `text-xs text-gray-400 dark:text-gray-500` |
| Progress bar track | `h-2 w-full rounded bg-gray-200 dark:bg-gray-700 overflow-hidden` |
| Progress bar fill | `h-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-200` |

---

---

## 12. Backend Implementation Plan (Laravel)

### 12.1 Database Schema

Create a dedicated `branding` table (following the `hero_slider_images` pattern):

```php
Schema::create('branding', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('tenant_id')->constrained('tenants')->onDelete('cascade');
    $table->text('header_logo_path')->nullable();
    $table->text('footer_logo_path')->nullable();
    $table->text('favicon_path')->nullable();
    $table->timestamps();
    $table->unique('tenant_id');
});
```

Each tenant has exactly one branding record (`unique('tenant_id')`). The `firstOrCreate` pattern is used in the controller to ensure the record exists on first save.

### 12.2 Storage Structure

```
storage/app/public/uploads/branding/
├── {tenant_id}/
│   ├── header-logo.{ext}
│   ├── footer-logo.png
│   └── favicon.{ext}
```

Use Laravel's `Storage::disk('public')` with symlink. URLs served via `Storage::url()`.

### 12.3 File Naming Convention

| Asset | File name | Expected format |
|-------|-----------|-----------------|
| Header Logo | `header-logo-{timestamp}.{ext}` | JPG, PNG, WebP, SVG |
| Footer Logo | `footer-logo-{timestamp}.png` | PNG only |
| Favicon | `favicon-{timestamp}.{ext}` | PNG, ICO |

### 12.4 Image Validation Rules

```php
'header_logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
'footer_logo' => ['nullable', 'image', 'mimes:png', 'max:2048'],
'favicon'     => ['nullable', 'image', 'mimes:png,ico', 'max:500'],
```

### 12.5 Trait + Controller (thin, following hero slider pattern)

**`app/Traits/BrandingTrait.php`** — all business logic:

```php
namespace App\Traits;

use App\Models\Branding;
use App\Models\Tenant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

trait BrandingTrait
{
    protected function showBranding(): ?Branding
    {
        $tenantId = $this->resolveTenantId();
        if (!$tenantId) return null;
        return Branding::where('tenant_id', $tenantId)->first();
    }

    protected function storeBrandingAssets(Request $request): Branding
    {
        $tenantId = $this->resolveTenantId();
        if (!$tenantId) throw new \RuntimeException('No tenant associated with this user');

        $branding = Branding::firstOrCreate(
            ['tenant_id' => $tenantId],
            ['id' => (string) Str::uuid()]
        );

        foreach (['header_logo', 'footer_logo', 'favicon'] as $field) {
            if (!$request->hasFile($field)) continue;
            $this->deleteBrandingFile($branding, $field);
            $column = $field . '_path';
            $ext = $field === 'footer_logo' ? 'png' : $request->file($field)->extension();
            $path = $request->file($field)->storeAs(
                "uploads/branding/{$tenantId}",
                str_replace('_', '-', $field) . '-' . time() . '.' . $ext, 'public'
            );
            $branding->{$column} = $path;
        }

        $branding->save();
        return $branding->fresh();
    }

    protected function removeBrandingAsset(string $type): Branding
    {
        if (!in_array($type, ['header_logo', 'footer_logo', 'favicon'])) {
            throw new \InvalidArgumentException('Invalid asset type');
        }
        $tenantId = $this->resolveTenantId();
        if (!$tenantId) throw new \RuntimeException('No tenant associated with this user');

        $branding = Branding::where('tenant_id', $tenantId)->first();
        if (!$branding) throw new \RuntimeException('No branding record found');

        $this->deleteBrandingFile($branding, $type);
        $branding->{$type . '_path'} = null;
        $branding->save();
        return $branding->fresh();
    }

    private function deleteBrandingFile($branding, string $type): void
    {
        $column = $type . '_path';
        if ($branding->{$column}) {
            Storage::disk('public')->delete($branding->{$column});
        }
    }

    private function resolveTenantId(): ?string
    {
        $user = auth()->user();
        if ($user && $user->tenant_id) return $user->tenant_id;
        return Tenant::where('storefront_active', true)->value('id');
    }
}
```

**`app/Http/Controllers/Api/BrandingController.php`** — thin controller:

```php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\Ecommerce\BrandingResource;
use App\Traits\BrandingTrait;
use App\Http\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BrandingController extends Controller
{
    use ApiResponse, BrandingTrait;

    public function show(): BrandingResource
    {
        return new BrandingResource($this->showBranding());
    }

    public function update(Request $request): BrandingResource|JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'header_logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp,svg', 'max:2048'],
            'footer_logo' => ['nullable', 'image', 'mimes:png', 'max:2048'],
            'favicon'     => ['nullable', 'image', 'mimes:png,ico', 'max:500'],
        ]);

        if ($validator->fails()) {
            return $this->validationError($validator->errors());
        }

        try {
            return new BrandingResource($this->storeBrandingAssets($request));
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage());
        }
    }

    public function destroy(string $type): BrandingResource|JsonResponse
    {
        try {
            return new BrandingResource($this->removeBrandingAsset($type));
        } catch (\InvalidArgumentException $e) {
            return $this->error($e->getMessage(), null, 400);
        } catch (\RuntimeException $e) {
            return $this->error($e->getMessage());
        }
    }
}
```

### 12.6 Model: `Branding`

```php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Branding extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id', 'tenant_id', 'header_logo_path', 'footer_logo_path', 'favicon_path',
    ];

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (Branding $branding) {
            if (empty($branding->id)) {
                $branding->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

### 12.7 Resource: `BrandingResource`

```php
namespace App\Http\Resources\Ecommerce;

use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class BrandingResource extends JsonResource
{
    public function toArray($request): array
    {
        if ($this->resource === null) {
            return [
                'header_logo_url' => null,
                'footer_logo_url' => null,
                'favicon_url' => null,
            ];
        }

        return [
            'header_logo_url' => $this->header_logo_path
                ? Storage::disk('public')->url($this->header_logo_path)
                : null,
            'footer_logo_url' => $this->footer_logo_path
                ? Storage::disk('public')->url($this->footer_logo_path)
                : null,
            'favicon_url' => $this->favicon_path
                ? Storage::disk('public')->url($this->favicon_path)
                : null,
        ];
    }
}
```

### 12.8 API Routes (`routes/route/ecommerce.php`)

```php
use App\Http\Controllers\Api\BrandingController;

// Inside the existing v1 auth:sanctum group
Route::prefix('branding')->group(function () {
    Route::get('/', [BrandingController::class, 'show']);
    Route::post('/', [BrandingController::class, 'update']);
    Route::delete('/{type}', [BrandingController::class, 'destroy']);
});
```

Routes registered: `GET|HEAD api/v1/branding`, `POST api/v1/branding`, `DELETE api/v1/branding/{type}`

### 12.9 Frontend-Backed Endpoint Contract

| Method | Endpoint | Request | Response |
|--------|----------|---------|----------|
| `GET` | `/api/v1/branding` | — | `{ data: { header_logo_url, footer_logo_url, favicon_url } }` |
| `POST` | `/api/v1/branding` | `multipart/form-data`: `header_logo` (file), `footer_logo` (file), `favicon` (file) | `{ data: { header_logo_url, footer_logo_url, favicon_url } }` |
| `DELETE` | `/api/v1/branding/{type}` | `type`: `header_logo`, `footer_logo`, or `favicon` | `{ data: { header_logo_url, footer_logo_url, favicon_url } }` |

### 12.10 Error Handling

- **Validation errors:** Return `422` with standard Laravel validation error format:
  ```json
  { "message": "Validation error", "errors": { "header_logo": ["The header logo must be an image."] } }
  ```
- **Invalid type (DELETE):** Return `400` with `"Invalid asset type"`
- **Unauthenticated:** Return `401` (handled by `auth:sanctum` middleware)

---

## 13. Future Enhancements (Out of Scope)

- **Mobile-specific logo:** Separate upload for mobile-optimized logo variant
- **Email template logo:** Logo variant sized for transactional emails
- **Social share image (OG:image):** Open Graph preview image for social media link previews
- **Auto-generate favicon sizes:** Backend auto-creates 16, 32, 48, 96, 144, 192, 256, 512px variants on upload
- **Cropping tool:** In-browser cropping before upload
