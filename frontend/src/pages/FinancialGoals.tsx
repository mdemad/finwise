import React, { useState } from 'react';
import { useGoals } from '../hooks/useGoals';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import { GlassCard, CustomInput, CustomButton } from '../components/UI';
import { formatCurrency, formatDate, CurrencyCode, currencies } from '../utils/formatters';
import { Goal, GoalCreate } from '../types/goals';
import {
  Target, Plus, X, CheckCircle, Clock, Trash2, Edit3,
  AlertCircle, TrendingUp, Flag, Award, RefreshCw, CalendarDays,
} from 'lucide-react';

const STATUS_CONFIG = {
  in_progress: {
    label: 'In Progress',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    bar: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    icon: Clock,
  },
  achieved: {
    label: 'Achieved',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    icon: Award,
  },
  abandoned: {
    label: 'Abandoned',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10 border-slate-500/20',
    bar: 'bg-slate-500',
    icon: X,
  },
};

export const FinancialGoals: React.FC = () => {
  const { user } = useAuth();
  const { currency: userCurrency } = useCurrency();
  const { goals, summary, loading, error, addGoal, updateGoal, deleteGoal, refresh } = useGoals();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | Goal['status']>('all');

  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    targetDate: '',
    currency: userCurrency as string,
    status: 'in_progress' as Goal['status'],
    notes: '',
  });

  const resetForm = () => {
    setForm({ name: '', targetAmount: '', targetDate: '', currency: userCurrency as string, status: 'in_progress', notes: '' });
    setFormError(null);
    setEditingGoal(null);
  };

  const handleOpenCreate = () => { resetForm(); setIsModalOpen(true); };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setForm({ name: goal.name, targetAmount: String(goal.targetAmount), targetDate: goal.targetDate.slice(0, 10), currency: goal.currency, status: goal.status, notes: goal.notes || '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const targetAmount = parseFloat(form.targetAmount);
    if (!form.name.trim()) { setFormError('Goal name is required.'); return; }
    if (isNaN(targetAmount) || targetAmount <= 0) { setFormError('Target amount must be > 0.'); return; }
    if (!form.targetDate) { setFormError('Target date is required.'); return; }
    setActionLoading(true);
    if (editingGoal) {
      const ok = await updateGoal(editingGoal.id, { name: form.name.trim(), targetAmount, targetDate: form.targetDate, currency: form.currency, status: form.status, notes: form.notes || undefined });
      setActionLoading(false);
      if (ok) { setIsModalOpen(false); resetForm(); } else { setFormError('Failed to update goal.'); }
    } else {
      const payload: GoalCreate = { name: form.name.trim(), targetAmount, targetDate: form.targetDate, currency: form.currency, status: form.status, notes: form.notes || undefined };
      const created = await addGoal(payload);
      setActionLoading(false);
      if (created) { setIsModalOpen(false); resetForm(); } else { setFormError('Failed to create goal.'); }
    }
  };

  const handleDelete = async (goal: Goal) => {
    if (!window.confirm(`Delete goal "${goal.name}"? Linked holdings will be unlinked.`)) return;
    setActionLoading(true);
    await deleteGoal(goal.id);
    setActionLoading(false);
  };

  const filteredGoals = filterStatus === 'all' ? goals : goals.filter(g => g.status === filterStatus);

  if (loading && !error && goals.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500">Loading Goals...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Financial Goals</h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Set targets, link investments, and track real progress.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refresh()} className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer" title="Refresh Goals">
            <RefreshCw className="w-4 h-4" />
          </button>
          <CustomButton variant="primary" size="sm" onClick={handleOpenCreate} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Goal
          </CustomButton>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => refresh()} className="underline font-bold cursor-pointer ml-4">Retry</button>
        </div>
      )}

      {/* Summary KPIs */}
      {summary && goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <GlassCard className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" /> Overall Progress
            </span>
            <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">{summary.overallProgressPercent.toFixed(1)}%</div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
              <div className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700" style={{ width: `${Math.min(100, summary.overallProgressPercent)}%` }} />
            </div>
            <div className="text-[10px] font-semibold text-slate-400 mt-1">
              {formatCurrency(summary.totalCurrentValue, userCurrency as CurrencyCode)} of {formatCurrency(summary.totalTargetAmount, userCurrency as CurrencyCode)}
            </div>
          </GlassCard>
          <GlassCard className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-blue-500" /> Active Goals
            </span>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{goals.filter(g => g.status === 'in_progress').length}</div>
            <div className="text-[10px] font-semibold text-slate-400">
              {goals.filter(g => g.status === 'achieved').length} achieved · {goals.filter(g => g.status === 'abandoned').length} abandoned
            </div>
          </GlassCard>
          {summary.closestGoalName && (
            <GlassCard className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-emerald-500" /> Closest to Completion
              </span>
              <div className="text-base font-extrabold text-slate-900 dark:text-white truncate">{summary.closestGoalName}</div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
                <div className="h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700" style={{ width: `${Math.min(100, summary.closestGoalProgress || 0)}%` }} />
              </div>
              <div className="text-[10px] font-semibold text-slate-400">{(summary.closestGoalProgress || 0).toFixed(1)}% progress</div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Filter Bar */}
      {goals.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'in_progress', 'achieved', 'abandoned'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${filterStatus === s ? 'bg-purple-500 text-white border-purple-500' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
              {s === 'all' ? 'All Goals' : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <GlassCard className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 mb-4">
            <Target className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{goals.length === 0 ? 'No Financial Goals Yet' : 'No Matching Goals'}</h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {goals.length === 0 ? 'Create your first financial goal and link your portfolio holdings to track real progress.' : 'Try changing the status filter.'}
          </p>
          {goals.length === 0 && (
            <CustomButton variant="primary" onClick={handleOpenCreate} className="gap-2">
              <Plus className="w-4 h-4" /> Create First Goal
            </CustomButton>
          )}
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredGoals.map(goal => {
            const cfg = STATUS_CONFIG[goal.status];
            const StatusIcon = cfg.icon;
            const pct = Math.min(100, goal.progressPercent);
            return (
              <GlassCard key={goal.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl border flex-shrink-0 ${cfg.bg}`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{goal.name}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleOpenEdit(goal)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg cursor-pointer transition-colors" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(goal)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-500">Progress</span>
                    <span className={pct >= 100 ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div className={`h-2 rounded-full transition-all duration-700 ${cfg.bar}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Current</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(goal.currentValue, goal.currency as CurrencyCode)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Target</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">{formatCurrency(goal.targetAmount, goal.currency as CurrencyCode)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">Remaining</span>
                    <span className={`font-extrabold ${goal.amountRemaining <= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {goal.amountRemaining <= 0 ? 'Achieved!' : formatCurrency(goal.amountRemaining, goal.currency as CurrencyCode)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-3">
                  <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Target: {formatDate(goal.targetDate)}</span>
                  <span className={goal.overdue ? 'text-red-500' : goal.daysRemaining <= 30 ? 'text-amber-500' : ''}>
                    {goal.overdue ? `${Math.abs(goal.daysRemaining)}d overdue` : `${goal.daysRemaining}d remaining`}
                  </span>
                </div>

                {goal.status !== 'achieved' && (
                  <div className="flex gap-2">
                    {goal.status !== 'in_progress' && (
                      <button onClick={() => updateGoal(goal.id, { status: 'in_progress' })}
                        className="flex-1 py-1.5 text-[10px] font-extrabold rounded-lg border border-blue-500/30 text-blue-500 hover:bg-blue-500/10 cursor-pointer transition-colors">
                        ↩ Reactivate
                      </button>
                    )}
                    <button onClick={() => updateGoal(goal.id, { status: 'achieved' })}
                      className="flex-1 py-1.5 text-[10px] font-extrabold rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 cursor-pointer transition-colors flex items-center justify-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Mark Achieved
                    </button>
                    {goal.status === 'in_progress' && (
                      <button onClick={() => updateGoal(goal.id, { status: 'abandoned' })}
                        className="flex-1 py-1.5 text-[10px] font-extrabold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                        Abandon
                      </button>
                    )}
                  </div>
                )}

                {goal.notes && (
                  <p className="text-[10px] text-slate-400 font-medium italic border-t border-slate-200 dark:border-slate-800 pt-2">{goal.notes}</p>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <GlassCard className="w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" /> {editingGoal ? 'Edit Goal' : 'Create Financial Goal'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <CustomInput label="Goal Name *" placeholder="e.g. Dream Home Down Payment, Retirement Fund" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />

              <div className="grid grid-cols-2 gap-3">
                <CustomInput label="Target Amount *" type="number" step="any" min="1" placeholder="0.00" value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })} required />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Currency</label>
                  <select value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer">
                    {Object.keys(currencies).map(code => (
                      <option key={code} value={code}>{code} ({currencies[code as CurrencyCode].symbol})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <CustomInput label="Target Date *" type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} required />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase text-slate-500">Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Goal['status'] })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 cursor-pointer">
                    <option value="in_progress">In Progress</option>
                    <option value="achieved">Achieved</option>
                    <option value="abandoned">Abandoned</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Notes (Optional)</label>
                <textarea rows={2} placeholder="Any details about this financial goal..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 resize-none" />
              </div>

              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                After creating this goal, go to <strong>Portfolio → Holdings → Details</strong> to link investment holdings to it.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <CustomButton type="button" variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }}>Cancel</CustomButton>
                <CustomButton type="submit" variant="primary" disabled={actionLoading}>
                  {actionLoading ? 'Saving...' : editingGoal ? 'Save Changes' : 'Create Goal'}
                </CustomButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};

export default FinancialGoals;
