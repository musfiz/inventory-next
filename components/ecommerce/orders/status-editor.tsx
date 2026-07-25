'use client';

import { useState } from 'react';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import type { StatusConfig } from '@/types/ecommerce';
import { notify } from '@/lib/notifications';

interface StatusEditorProps {
  config: StatusConfig[];
  onSave?: (config: StatusConfig[]) => void;
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

export default function StatusEditor({ config, onSave }: StatusEditorProps) {
  const [editingConfig, setEditingConfig] = useState<StatusConfig[]>(() =>
    config.map(c => ({ ...c, allowed_transitions: [...c.allowed_transitions] }))
  );
  const [selectedStatus, setSelectedStatus] = useState<string>(config[0]?.status || '');
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const current = editingConfig.find(c => c.status === selectedStatus) || editingConfig[0];

  const updateField = (field: string, value: any) => {
    setEditingConfig(prev =>
      prev.map(c => c.status === current.status ? { ...c, [field]: value } : c)
    );
    setHasChanges(true);
  };

  const toggleTransition = (to: string) => {
    setEditingConfig(prev =>
      prev.map(c => {
        if (c.status !== current.status) return c;
        const exists = c.allowed_transitions.find(t => t.to === to);
        if (exists) {
          return { ...c, allowed_transitions: c.allowed_transitions.filter(t => t.to !== to) };
        }
        return {
          ...c,
          allowed_transitions: [...c.allowed_transitions, { from: c.status as any, to: to as any, label: `Move to ${to}` }],
        };
      })
    );
    setHasChanges(true);
  };

  const toggleTransitionFlag = (to: string, flag: 'requires_tracking' | 'requires_note') => {
    setEditingConfig(prev =>
      prev.map(c => {
        if (c.status !== current.status) return c;
        return {
          ...c,
          allowed_transitions: c.allowed_transitions.map(t =>
            t.to === to ? { ...t, [flag]: !(t as any)[flag] } : t
          ),
        };
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      onSave?.(editingConfig);
      setHasChanges(false);
      notify.success('Status configuration saved');
    } catch {
      notify.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditingConfig(config.map(c => ({ ...c, allowed_transitions: [...c.allowed_transitions] })));
    setHasChanges(false);
    notify.success('Reset to defaults');
  };

  const allStatuses = editingConfig.filter(c => c.status !== current.status && !['cancelled', 'returned'].includes(c.status));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-700">
        {editingConfig.map(cfg => (
          <button
            key={cfg.status}
            onClick={() => setSelectedStatus(cfg.status)}
            className={`px-2.5 py-1 text-xs font-medium rounded-sm cursor-pointer transition-colors ${
              selectedStatus === cfg.status
                ? 'text-white ' + (STATUS_BG[cfg.status] || 'bg-gray-500')
                : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      {current && (
        <div className="p-3 space-y-3">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Label</label>
              <input
                type="text"
                value={current.label}
                onChange={e => updateField('label', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Order</label>
              <input
                type="number"
                value={current.order}
                onChange={e => updateField('order', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                min={1}
                max={10}
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Description</label>
            <input
              type="text"
              value={current.description}
              onChange={e => updateField('description', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-sm dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Flags */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={current.auto_notify || false}
                onChange={e => updateField('auto_notify', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              Auto-notify customer
            </label>
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={current.requires_tracking || false}
                onChange={e => updateField('requires_tracking', e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              Requires tracking
            </label>
          </div>

          {/* Allowed transitions */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Allowed Transitions</h4>
            {allStatuses.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No transitions available</p>
            ) : (
              <div className="space-y-1">
                {allStatuses.map(target => {
                  const transition = current.allowed_transitions.find(t => t.to === target.status);
                  const enabled = !!transition;
                  return (
                    <div key={target.status} className="flex items-center gap-2 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer min-w-[100px]">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => toggleTransition(target.status)}
                          className="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>→ {target.icon} {target.label}</span>
                      </label>
                      {enabled && (
                        <div className="flex items-center gap-2 ml-2">
                          <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={transition.requires_tracking || false}
                              onChange={() => toggleTransitionFlag(target.status, 'requires_tracking')}
                              className="rounded border-gray-300 dark:border-gray-600 text-amber-500 focus:ring-amber-500 w-2.5 h-2.5"
                            />
                            Require tracking
                          </label>
                          <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={transition.requires_note || false}
                              onChange={() => toggleTransitionFlag(target.status, 'requires_note')}
                              className="rounded border-gray-300 dark:border-gray-600 text-amber-500 focus:ring-amber-500 w-2.5 h-2.5"
                            />
                            Require note
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleReset}
          disabled={!hasChanges}
          className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 rounded-sm cursor-pointer disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-3 h-3" /> Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 rounded-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Config
        </button>
      </div>
    </div>
  );
}
