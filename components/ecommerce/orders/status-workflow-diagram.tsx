'use client';

import { useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { StatusConfig, EcommerceOrder } from '@/types/ecommerce';

interface StatusWorkflowDiagramProps {
  config: StatusConfig[];
  onConfigChange?: (config: StatusConfig[]) => void;
  readOnly?: boolean;
}

const STATUS_BG: Record<string, string> = {
  placed: 'bg-blue-500',
  confirmed: 'bg-indigo-500',
  packed: 'bg-purple-500',
  shipped: 'bg-yellow-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  returned: 'bg-orange-500',
};

export default function StatusWorkflowDiagram({ config, onConfigChange, readOnly }: StatusWorkflowDiagramProps) {
  const mainFlow = config.filter(c => !['cancelled', 'returned'].includes(c.status));
  const terminalStatuses = config.filter(c => ['cancelled', 'returned'].includes(c.status));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Status Flow Diagram</h3>

      {/* Main flow */}
      <div className="flex items-center flex-wrap gap-1.5 mb-4">
        {mainFlow.map((cfg, idx) => (
          <div key={cfg.status} className="flex items-center">
            <div className={`${STATUS_BG[cfg.status]} text-white px-3 py-1.5 rounded-sm text-xs font-medium whitespace-nowrap`}>
              {cfg.icon} {cfg.label}
            </div>
            {idx < mainFlow.length - 1 && (
              <ArrowRight className="w-4 h-4 mx-1 text-gray-400" />
            )}
          </div>
        ))}
      </div>

      {/* Terminal branches */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">↓</span>
        <div className="flex items-center gap-1.5 ml-4">
          {terminalStatuses.map(cfg => (
            <div key={cfg.status} className={`${STATUS_BG[cfg.status]} text-white px-2.5 py-1 rounded-sm text-xs font-medium whitespace-nowrap`}>
              {cfg.icon} {cfg.label}
            </div>
          ))}
        </div>
      </div>

      {/* Diverging arrows from main flow */}
      <div className="ml-1 mt-2 space-y-1">
        {mainFlow.filter(c => c.allowed_transitions.some(t => t.to === 'cancelled')).map(cfg => (
          <div key={`cancel-${cfg.status}`} className="flex items-center gap-1.5 text-[10px] text-gray-500">
            <span className="w-2 h-0.5 bg-gray-300" />
            <span className="text-gray-400">{cfg.label}</span>
            <ArrowRight className="w-3 h-3 text-red-400" />
            <span className="text-red-500 font-medium">Cancelled</span>
          </div>
        ))}
      </div>

      {/* Allowed transitions table */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Allowed Transitions</h4>
        <div className="space-y-1">
          {config.map(cfg => (
            cfg.allowed_transitions.length > 0 && (
              <div key={cfg.status} className="flex items-center gap-2 text-xs">
                <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-medium ${STATUS_BG[cfg.status]}`}>
                  {cfg.label}
                </span>
                {cfg.allowed_transitions.map((t, i) => (
                  <span key={t.to} className="flex items-center gap-1">
                    {i > 0 && <span className="text-gray-300">|</span>}
                    <ArrowRight className="w-2.5 h-2.5 text-gray-400" />
                    <span className={`px-1.5 py-0.5 rounded text-white text-[10px] font-medium ${STATUS_BG[t.to] || 'bg-gray-400'}`}>
                      {config.find(c => c.status === t.to)?.label || t.to}
                    </span>
                    {t.requires_tracking && <span className="text-amber-500 text-[9px]">(tracking req.)</span>}
                    {t.requires_note && <span className="text-amber-500 text-[9px]">(note req.)</span>}
                  </span>
                ))}
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
