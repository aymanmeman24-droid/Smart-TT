'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Edit3, Trash2, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Room } from '@/types';

interface RoomForm { room_number: string; building: string; floor: string; capacity: string; }

export default function RoomsPage() {
  const supabase = createClient();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomForm>({ room_number: '', building: '', floor: '', capacity: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('rooms').select('*').order('room_number');
    setRooms(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rooms.filter(r => !search || r.room_number.toLowerCase().includes(search.toLowerCase()) || r.building?.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    const payload = { room_number: form.room_number.trim(), building: form.building.trim() || null, floor: form.floor.trim() || null, capacity: form.capacity ? parseInt(form.capacity) : null };
    if (!payload.room_number) { setFormError('Room number is required.'); setSaving(false); return; }

    const { error } = editingId
      ? await supabase.from('rooms').update(payload).eq('id', editingId)
      : await supabase.from('rooms').insert(payload);

    if (error) { setFormError(error.message); } else { setShowForm(false); setEditingId(null); setForm({ room_number: '', building: '', floor: '', capacity: '' }); load(); }
    setSaving(false);
  };

  const statusColors: Record<string, string> = { active: 'badge-published', inactive: 'badge-cancelled', maintenance: 'badge-next' };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 lg:pl-0 pl-12">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Building2 className="w-6 h-6 text-yellow-400" /> Rooms
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{rooms.filter(r => r.status === 'active').length} active rooms</p>
        </div>
        <button id="addRoomBtn" onClick={() => { setEditingId(null); setForm({ room_number: '', building: '', floor: '', capacity: '' }); setShowForm(true); }} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Room
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
        <input className="input-field pl-9 py-2.5" placeholder="Search rooms..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="glass-card overflow-hidden">
        {loading ? <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-yellow-400" /></div> : (
          <table className="data-table">
            <thead><tr><th>Room</th><th>Building</th><th>Floor</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><span className="font-bold" style={{ color: 'var(--text-primary)' }}>{r.room_number}</span></td>
                  <td>{r.building || '—'}</td>
                  <td>{r.floor || '—'}</td>
                  <td>{r.capacity || '—'}</td>
                  <td><span className={`badge text-xs ${statusColors[r.status]}`}>{r.status}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setForm({ room_number: r.room_number, building: r.building || '', floor: r.floor || '', capacity: r.capacity ? String(r.capacity) : '' }); setEditingId(r.id); setShowForm(true); }} className="p-1.5 rounded hover:bg-white/5" id={`editRoom-${r.id}`}><Edit3 className="w-3.5 h-3.5 text-blue-400" /></button>
                      <button onClick={async () => { await supabase.from('rooms').update({ status: 'inactive' }).eq('id', r.id); load(); }} className="p-1.5 rounded hover:bg-white/5" id={`deleteRoom-${r.id}`}><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card w-full max-w-md">
            <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{editingId ? 'Edit Room' : 'Add Room'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Room Number *</label>
                <input className="input-field" value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} placeholder="4102" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Building</label>
                  <input className="input-field" value={form.building} onChange={e => setForm(p => ({ ...p, building: e.target.value }))} placeholder="B Block" />
                </div>
                <div>
                  <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Floor</label>
                  <input className="input-field" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} placeholder="4th Floor" />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Capacity</label>
                <input className="input-field" type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="60" min={1} />
              </div>
              {formError && <div className="text-sm text-red-400 flex items-center gap-1"><AlertTriangle className="w-4 h-4" />{formError}</div>}
              <div className="flex gap-3">
                <button type="submit" id="saveRoomBtn" className="btn-primary flex-1" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editingId ? 'Update' : 'Add'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
