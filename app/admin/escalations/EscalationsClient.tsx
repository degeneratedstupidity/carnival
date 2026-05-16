'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { EscalationRule, Escalation } from '@/types'

const RULE_LABELS: Record<string, string> = {
  submission_delay: 'Goal submission delay',
  approval_delay: 'Manager approval delay',
  checkin_delay: 'Check-in delay',
}

interface EscalationWithJoins extends Omit<Escalation, 'target_user'> {
  target_user: { name: string; department: string | null } | null
  rule: { rule_type: string } | null
}

interface Props {
  rules: EscalationRule[]
  escalations: EscalationWithJoins[]
}

export function EscalationsClient({ rules: initialRules, escalations: initialEscalations }: Props) {
  const supabase = createClient()
  const [rules, setRules] = useState(initialRules)
  const [escalations, setEscalations] = useState(initialEscalations)
  const [savingRule, setSavingRule] = useState<string | null>(null)

  async function updateRule(ruleId: string, field: 'threshold_days' | 'is_active', value: number | boolean) {
    setSavingRule(ruleId)
    const { error } = await supabase.from('escalation_rules').update({ [field]: value }).eq('id', ruleId)
    if (error) { toast.error('Could not save rule'); setSavingRule(null); return }
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, [field]: value } : r))
    toast.success('Rule updated')
    setSavingRule(null)
  }

  async function resolveEscalation(id: string) {
    const { error } = await supabase.from('escalations').update({ status: 'resolved' }).eq('id', id)
    if (error) { toast.error('Could not resolve'); return }
    setEscalations(prev => prev.map(e => e.id === id ? { ...e, status: 'resolved' as const } : e))
    toast.success('Escalation resolved')
  }

  const pending = escalations.filter(e => e.status === 'pending')
  const resolved = escalations.filter(e => e.status === 'resolved')

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Escalations</h1>
        <p className="text-sm text-slate-500 mt-1">Configure delay thresholds and review triggered escalations.</p>
      </div>

      {/* Rules config */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Escalation rules</h2>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {rules.map(rule => (
            <div key={rule.id} className="px-4 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-900">{RULE_LABELS[rule.rule_type] ?? rule.rule_type}</p>
                <p className="text-xs text-slate-500 mt-0.5">Triggers if delayed beyond threshold</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    defaultValue={rule.threshold_days}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value)
                      if (!isNaN(v) && v !== rule.threshold_days) updateRule(rule.id, 'threshold_days', v)
                    }}
                    className="w-16 rounded border border-slate-200 px-2 py-1 text-sm text-center"
                  />
                  <span className="text-xs text-slate-500">days</span>
                </div>
                <button
                  onClick={() => updateRule(rule.id, 'is_active', !rule.is_active)}
                  disabled={savingRule === rule.id}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                    rule.is_active
                      ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {rule.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending escalations */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Pending escalations
          {pending.length > 0 && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">{pending.length}</span>
          )}
        </h2>
        {pending.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No pending escalations. System is running smoothly.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {pending.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{e.target_user?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{e.target_user?.department} · {RULE_LABELS[e.rule?.rule_type ?? ''] ?? e.rule?.rule_type}</p>
                  {e.message && <p className="text-xs text-slate-400 mt-0.5 truncate">{e.message}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-400">{new Date(e.created_at).toLocaleDateString('en-IN')}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                    onClick={() => resolveEscalation(e.id)}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Resolved */}
      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Resolved ({resolved.length})</h2>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {resolved.slice(0, 20).map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center justify-between gap-4 opacity-60">
                <div>
                  <p className="text-sm text-slate-700">{e.target_user?.name}</p>
                  <p className="text-xs text-slate-500">{RULE_LABELS[e.rule?.rule_type ?? ''] ?? e.rule?.rule_type}</p>
                </div>
                <Badge variant="outline" className="text-xs text-green-700 border-green-300 bg-green-50">Resolved</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
