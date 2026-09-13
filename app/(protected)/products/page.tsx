'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Rows4, Package2, Plus, Image, X } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import DataTable from '@/components/ui/datatable';
import CustomSelect from '@/components/ui/custom-select';
import BusinessTypeSelect from '@/components/ui/business-type-select';
import { Product, Category } from '@/types/api.types';
import { productService } from '@/services';
import apiClient from '@/lib/api/axios';
import { usePermissions } from '@/hooks/use-permissions';
import { useCategories } from '@/services/queries/useCategories';
import { confirm, notify } from '@/lib/notifications';
import { useAuthStore } from '@/stores/auth-store';
import dynamic from 'next/dynamic';
const BarcodeStickerPrint = dynamic(
  () => import('@/components/print/barcode/BarcodeStickerPrint'),
  { ssr: false, loading: () => null },
);
import { ImDownload } from "react-icons/im";
import { RiDragDropLine, RiFileExcel2Line } from "react-icons/ri";
import { TiUploadOutline } from "react-icons/ti";
import { PiListBulletsFill, PiListPlusFill } from "react-icons/pi";