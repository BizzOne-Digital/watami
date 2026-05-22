'use client'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2, Star, Eye, EyeOff, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatCurrency } from '@/lib/utils'

interface Category { _id: string; name: string }
interface MenuItem {
  _id: string; name: string; price: number; description?: string
  categoryId: string | { _id: string; name: string }
  imageUrl?: string
  tags: string[]; isAvailable: boolean; isPopular: boolean
  popularOverride: string; orderCount: number; sortOrder: number
}

const emptyForm = {
  name: '', description: '', price: 0, categoryId: '',
  imageUrl: '',
  tags: [] as string[], isAvailable: true, isPopular: false,
  popularOverride: 'auto', sortOrder: 0,
}

const TAG_OPTIONS = ['vegetarian', 'gf', 'spicy']

export default function AdminMenuItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [availFilter, setAvailFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    const res = await fetch('/api/admin/categories')
    const data = await res.json()
    setCategories(data.categories ?? [])
  }, [])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '200' })
      if (catFilter !== 'all') params.set('categoryId', catFilter)
      const res = await fetch(`/api/admin/menu-items?${params}`)
      const data = await res.json()
      setItems(data.items ?? [])
      setTotal(data.total ?? 0)
    } catch { toast.error('Failed to load items') }
    finally { setLoading(false) }
  }, [page, catFilter])

  useEffect(() => { fetchCategories(); fetchItems() }, [fetchCategories, fetchItems])

  const getCategoryName = (cat: string | { _id: string; name: string }) => {
    if (typeof cat === 'object') return cat.name
    return categories.find(c => c._id === cat)?.name ?? '—'
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyForm, categoryId: catFilter !== 'all' ? catFilter : '' })
    setImagePreview(null)
    setDialogOpen(true)
  }

  const openEdit = (item: MenuItem) => {
    setEditingId(item._id)
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      categoryId: typeof item.categoryId === 'object' ? item.categoryId._id : item.categoryId,
      imageUrl: item.imageUrl ?? '',
      tags: item.tags,
      isAvailable: item.isAvailable,
      isPopular: item.isPopular,
      popularOverride: item.popularOverride,
      sortOrder: item.sortOrder,
    })
    setImagePreview(item.imageUrl || null)
    setDialogOpen(true)
  }

  const handleUrlChange = (url: string) => {
    setForm(prev => ({ ...prev, imageUrl: url }))
    setImagePreview(url.trim() || null)
  }

  const handleRemoveImage = () => {
    setForm(prev => ({ ...prev, imageUrl: '' }))
    setImagePreview(null)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.categoryId || form.price <= 0) {
      toast.error('Name, category, and price are required')
      return
    }
    setSaving(true)
    try {
      const url = editingId ? `/api/admin/menu-items/${editingId}` : '/api/admin/menu-items'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error ?? 'Failed'); return }
      toast.success(editingId ? 'Item updated' : 'Item created')
      setDialogOpen(false)
      fetchItems()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/menu-items/${id}`, { method: 'DELETE' })
      toast.success('Item deleted')
      setDeleteId(null)
      fetchItems()
    } catch { toast.error('Failed to delete') }
  }

  const toggleAvailable = async (item: MenuItem) => {
    try {
      await fetch(`/api/admin/menu-items/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      })
      fetchItems()
    } catch { toast.error('Failed to update') }
  }

  const filteredItems = items.filter(i => {
    const matchSearch = search ? i.name.toLowerCase().includes(search.toLowerCase()) : true
    const matchAvail = availFilter === 'all' ? true : availFilter === 'visible' ? i.isAvailable : !i.isAvailable
    return matchSearch && matchAvail
  })

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Menu Items</h1>
          <p className="text-gray-500 text-sm">{total} items</p>
        </div>
        <Button onClick={openCreate} className="bg-burgundy hover:bg-burgundy-dark text-white">
          <Plus className="w-4 h-4 mr-2" />Add Item
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search items..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1) }}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={availFilter} onValueChange={(v) => setAvailFilter(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="visible">Visible Only</SelectItem>
            <SelectItem value="hidden">Hidden Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Price</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Orders</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Visibility</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={encodeURI(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍱</div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-charcoal">{item.name}</span>
                            {item.isPopular && <Star className="w-3.5 h-3.5 text-orange fill-orange" />}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            {item.tags.map(t => (
                              <span key={t} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{getCategoryName(item.categoryId)}</td>
                    <td className="px-4 py-3 font-semibold text-burgundy">{formatCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{item.orderCount}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAvailable(item)}
                        title={item.isAvailable ? 'Click to hide from menu' : 'Click to show on menu'}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          item.isAvailable
                            ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
                            : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
                        }`}
                      >
                        {item.isAvailable
                          ? <><Eye className="w-3.5 h-3.5" /> Visible</>
                          : <><EyeOff className="w-3.5 h-3.5" /> Hidden</>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-burgundy hover:bg-burgundy/10 rounded transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteId(item._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
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
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Item' : 'New Menu Item'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto pr-1">

            {/* ── Image URL ── */}
            <div>
              <Label>Image URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="https://... or /menu-images/filename.png"
                  value={form.imageUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="text-sm"
                />
                {form.imageUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0"
                    title="Clear image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Live preview */}
              {imagePreview && (
                <div className="mt-2 w-full h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImagePreview(null)}
                  />
                </div>
              )}
            </div>

            {/* ── Name ── */}
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>

            {/* ── Description ── */}
            <div>
              <Label>Description</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-burgundy resize-none"
              />
            </div>

            {/* ── Price + Sort ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (AUD) *</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="mt-1" />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="mt-1" />
              </div>
            </div>

            {/* ── Category ── */}
            <div>
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── Tags ── */}
            <div>
              <Label>Tags</Label>
              <div className="flex gap-3 mt-1">
                {TAG_OPTIONS.map(tag => (
                  <label key={tag} className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag)}
                      onChange={(e) => setForm({ ...form, tags: e.target.checked ? [...form.tags, tag] : form.tags.filter(t => t !== tag) })}
                      className="rounded"
                    />
                    {tag}
                  </label>
                ))}
              </div>
            </div>

            {/* ── Popular Override ── */}
            <div>
              <Label>Popular Override</Label>
              <Select value={form.popularOverride} onValueChange={(v) => setForm({ ...form, popularOverride: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (based on orders)</SelectItem>
                  <SelectItem value="force_popular">Force Popular</SelectItem>
                  <SelectItem value="force_not_popular">Force Not Popular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ── Available ── */}
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isAvailable} onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })} className="rounded" />
                Available
              </label>
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

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Menu Item</DialogTitle></DialogHeader>
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
