'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Promotion {
  _id: string; title: string; description?: string; type: string
  value: number; code?: string; startsAt: string; endsAt: string
  isActive: boolean; appliesTo: string
}

const emptyForm = {
  title: '', description: '', type: 'percentage', value: 0,
  code: '', startsAt: '', endsAt: '', isActive: true, appliesTo: 'all',
}

export default function AdminPromotionsPage() {
  const [promos, setPromos] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchPromos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promotions')
      const data = await res.json()
      setPromos(data.promotions ?? [])
    } catch { toast.error('Failed to load promotions') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchPromos() }, [fetchPromos])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (p: Promotion) => {
    setEditingId(p._id)
    setForm({
      title: p.title, description: p.description ?? '', type: p.type,
      value: p.value, code: p.code ?? '',
      startsAt: p.startsAt.slice(0, 16),
      endsAt: p.endsAt.slice(0, 16),
      isActive: p.isActive, appliesTo: p.appliesTo,
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.startsAt || !form.endsAt) {
      toast.error('Title, start date, and end date are required')
      return
    }
    setSaving(true)
    try {
      const url = editingId ? `/api/admin/promotions/${editingId}` : '/api/admin/promotions'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, code: form.code || undefined }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return }
      toast.success(editingId ? 'Promotion updated' : 'Promotion created')
      setDialogOpen(false)
      fetchPromos()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE' })
      toast.success('Promotion deleted')
      setDeleteId(null)
      fetchPromos()
    } catch { toast.error('Failed to delete') }
  }

  const toggleActive = async (p: Promotion) => {
    try {
      await fetch(`/api/admin/promotions/${p._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive }),
      })
      fetchPromos()
    } catch { toast.error('Failed to update') }
  }

  const isExpired = (endsAt: string) => new Date(endsAt) < new Date()

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Promotions & Coupons</h1>
          <p className="text-gray-500 text-sm">{promos.length} promotions</p>
        </div>
        <Button onClick={openCreate} className="bg-burgundy hover:bg-burgundy-dark text-white">
          <Plus className="w-4 h-4 mr-2" />Add Promotion
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : promos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No promotions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Title</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Dates</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {promos.map((p) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-charcoal">{p.title}</p>
                      {p.description && <p className="text-gray-400 text-xs line-clamp-1">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-orange/10 text-orange px-2 py-0.5 rounded text-xs font-medium">
                        {p.type === 'percentage' ? `${p.value}%` : p.type === 'fixed' ? `$${p.value}` : 'Banner'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.code ? (
                        <code className="bg-gray-100 text-burgundy px-2 py-0.5 rounded font-mono text-xs">{p.code}</code>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      <p>{new Date(p.startsAt).toLocaleDateString('en-AU')}</p>
                      <p>→ {new Date(p.endsAt).toLocaleDateString('en-AU')}</p>
                      {isExpired(p.endsAt) && <span className="text-red-500">Expired</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(p)} className="flex items-center gap-1 text-xs">
                        {p.isActive
                          ? <><ToggleRight className="w-5 h-5 text-green-500" /><span className="text-green-600">Active</span></>
                          : <><ToggleLeft className="w-5 h-5 text-gray-400" /><span className="text-gray-400">Inactive</span></>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-burgundy hover:bg-burgundy/10 rounded transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(p._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Promotion' : 'New Promotion'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                    <SelectItem value="banner">Banner only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type !== 'banner' && (
                <div>
                  <Label>Value *</Label>
                  <Input type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })} className="mt-1" />
                </div>
              )}
            </div>
            <div>
              <Label>Coupon Code (optional)</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="mt-1" placeholder="e.g. SAVE10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starts At *</Label>
                <Input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Ends At *</Label>
                <Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="promoActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              <Label htmlFor="promoActive">Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-burgundy hover:bg-burgundy-dark text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Promotion</DialogTitle></DialogHeader>
          <p className="text-gray-600 text-sm">Are you sure? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
