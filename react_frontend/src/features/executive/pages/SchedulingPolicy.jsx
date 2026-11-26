import { useEffect, useState } from 'react';
import { CalendarClock, Clock, CalendarDays, ShieldAlert, Plus, Trash2, Save } from 'lucide-react';
import { Button } from '../../../shared/components/Button';
import { FormField, Input } from '../../../shared/components/FormField';
import { Loader } from '../../../shared/components/Loader';
import { useToast } from '../../../shared/components/Toast';
import * as schedulingApi from '../../../services/api/scheduling';

const WEEKDAYS = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];

export default function SchedulingPolicy() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [policy, setPolicy] = useState({
    workHoursPerDay: 8,
    workingDays: [1, 2, 3, 4, 5],
    defaultReviewBufferDays: 1,
    enforceCapacityBlock: false,
    holidays: [],
  });
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  useEffect(() => {
    let active = true;
    Promise.resolve(schedulingApi.getPolicy?.())
      .then((data) => {
        if (!active || !data) return;
        setPolicy({
          workHoursPerDay: Number(data.workHoursPerDay ?? 8),
          workingDays: Array.isArray(data.workingDays) ? data.workingDays : [1, 2, 3, 4, 5],
          defaultReviewBufferDays: Number(data.defaultReviewBufferDays ?? 1),
          enforceCapacityBlock: Boolean(data.enforceCapacityBlock),
          holidays: Array.isArray(data.holidays) ? data.holidays : [],
        });
      })
      .catch((err) => {
        if (active) toast.error(err?.message || 'Failed to load scheduling policy.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [toast]);

  const toggleDay = (dayId) => {
    setPolicy((prev) => {
      const exists = prev.workingDays.includes(dayId);
      if (exists && prev.workingDays.length === 1) return prev;
      const nextDays = exists
        ? prev.workingDays.filter((d) => d !== dayId)
        : [...prev.workingDays, dayId].sort((a, b) => a - b);
      return { ...prev, workingDays: nextDays };
    });
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await schedulingApi.updatePolicy({
        workHoursPerDay: Number(policy.workHoursPerDay),
        workingDays: policy.workingDays,
        defaultReviewBufferDays: Number(policy.defaultReviewBufferDays),
        enforceCapacityBlock: Boolean(policy.enforceCapacityBlock),
      });
      setPolicy((prev) => ({
        ...prev,
        ...updated,
        holidays: updated?.holidays || prev.holidays,
      }));
      toast.success('Scheduling policy saved.');
    } catch (err) {
      toast.error(err?.message || 'Could not update scheduling policy.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = async (e) => {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) {
      toast.error('Enter both a holiday date and name.');
      return;
    }
    setAddingHoliday(true);
    try {
      const created = await schedulingApi.addHoliday({
        date: holidayDate,
        name: holidayName.trim(),
      });
      setPolicy((prev) => {
        const filtered = prev.holidays.filter((h) => h.date !== created.date);
        return {
          ...prev,
          holidays: [...filtered, created].sort((a, b) => a.date.localeCompare(b.date)),
        };
      });
      setHolidayDate('');
      setHolidayName('');
      toast.success('Holiday added.');
    } catch (err) {
      toast.error(err?.message || 'Failed to add holiday.');
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    try {
      await schedulingApi.removeHoliday(id);
      setPolicy((prev) => ({
        ...prev,
        holidays: prev.holidays.filter((h) => h.id !== id),
      }));
      toast.success('Holiday removed.');
    } catch (err) {
      toast.error(err?.message || 'Failed to remove holiday.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-8">
        <Loader />
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Loading scheduling policy...
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
            <CalendarClock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Scheduling & Capacity Policy</h1>
            <p className="text-sm text-slate-500">
              Configure working hours, review buffers, capacity enforcement, and company holidays used across all tasks.
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSavePolicy} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FormField
            label="Work Hours Per Day"
            hint="Used to convert calendar days into available person-hours (1–24h)"
          >
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="number"
                min="1"
                max="24"
                step="0.5"
                className="pl-9"
                value={policy.workHoursPerDay}
                onChange={(e) => setPolicy((p) => ({ ...p, workHoursPerDay: e.target.value }))}
              />
            </div>
          </FormField>

          <FormField
            label="Default Pre-Deadline Review Buffer (Working Days)"
            hint="Days reserved before task due date for Team Lead, Compliance, and PM review"
          >
            <Input
              type="number"
              min="0"
              max="30"
              step="1"
              value={policy.defaultReviewBufferDays}
              onChange={(e) => setPolicy((p) => ({ ...p, defaultReviewBufferDays: e.target.value }))}
            />
          </FormField>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-slate-800">Working Days of Week</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => {
              const active = policy.workingDays.includes(day.id);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-500">
            Selected: {policy.workingDays.length} day(s)/week ({Number(policy.workHoursPerDay || 8) * policy.workingDays.length}h standard weekly capacity per employee).
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldAlert className={`w-4 h-4 ${policy.enforceCapacityBlock ? 'text-rose-600' : 'text-amber-600'}`} />
              <span className="text-sm font-semibold text-slate-900">Strict Capacity Enforcement</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When enabled, subtasks or tasks whose estimated hours or critical-path chain exceed available working hours (or overload an assignee) are blocked on save unless explicitly overridden. When disabled, OptiFlow displays warnings while still enforcing hard date, budget, and dependency rules.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 shrink-0 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={policy.enforceCapacityBlock}
              onChange={(e) => setPolicy((p) => ({ ...p, enforceCapacityBlock: e.target.checked }))}
            />
            <span className="text-xs font-semibold text-slate-800">
              {policy.enforceCapacityBlock ? 'Strict' : 'Advisory'}
            </span>
          </label>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Button type="submit" variant="primary" disabled={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving...' : 'Save Scheduling Policy'}
          </Button>
        </div>
      </form>

      <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900">Company Holidays</h2>
            <p className="text-xs text-slate-500">Excluded automatically from working-day capacity and auto-schedule timelines.</p>
          </div>
        </div>

        <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-[180px_1fr_auto] gap-3 items-end">
          <FormField label="Date">
            <Input type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
          </FormField>
          <FormField label="Holiday Name">
            <Input
              placeholder="e.g. Republic Day / Company Offsite"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
            />
          </FormField>
          <Button type="submit" variant="outline" disabled={addingHoliday}>
            <Plus className="w-4 h-4 mr-1" />
            {addingHoliday ? 'Adding...' : 'Add Holiday'}
          </Button>
        </form>

        {policy.holidays.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No company holidays configured yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {policy.holidays.map((holiday) => (
              <li key={holiday.id} className="flex items-center justify-between px-4 py-2.5 text-sm bg-white">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {holiday.date}
                  </span>
                  <span className="font-medium text-slate-800">{holiday.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteHoliday(holiday.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded cursor-pointer"
                  title="Remove holiday"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
