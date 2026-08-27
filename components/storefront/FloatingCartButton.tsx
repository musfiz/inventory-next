'use client';

import { useCartStore } from '@/stores/cart-store';
import { formatMoney } from '@/lib/utils/format';
import { GiPaperBagOpen } from 'react-icons/gi';

export default function FloatingCartButton() {
  const items = useCartStore(s => s.items);
  const getSubtotal = useCartStore(s => s.getSubtotal);
  const getItemCount = useCartStore(s => s.getItemCount);
  const openDrawer = useCartStore(s => s.openDrawer);

  return (
    <button
      onClick={openDrawer}
      className="fixed right-0 top-1/2 z-40 -translate-y-1/2 flex flex-col items-center gap-0.5 rounded-l-md bg-brand-600 px-3 py-3 text-white shadow-xl transition-all hover:bg-brand-700 active:scale-95"
      aria-label={`Open cart with ${getItemCount()} items, total ${formatMoney(getSubtotal())}`}
    >
      <GiPaperBagOpen className="h-7 w-7" />
      <span className="text-[10px] font-bold leading-tight">
        {getItemCount()} item(s)
      </span>
      <span className="rounded-md bg-yellow-400 px-1.5 py-0.5 text-[11px] font-black leading-tight text-gray-900">
        {formatMoney(getSubtotal())}
      </span>
    </button>
  );
}
