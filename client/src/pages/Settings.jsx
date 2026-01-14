import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { apiCreateItem, apiDeleteItem, apiListItems, apiUpdateItem } from '@/lib/itemsApi';
import { apiUpdateProfile } from '@/lib/profileApi';
import { useAuth } from '@/state/auth.jsx';
import { useMoney } from '@/lib/money.js';

function Settings() {
  const reduceMotion = useReducedMotion();
  const { token, user } = useAuth();
  const money = useMoney();

  const [active, setActive] = useState('profile');

  const [profileCompany, setProfileCompany] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileTaxId, setProfileTaxId] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [defaultTaxName, setDefaultTaxName] = useState('GST');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0);
  const [taxMode, setTaxMode] = useState('invoice');
  const [defaultPaymentTermsDays, setDefaultPaymentTermsDays] = useState(0);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsSaving, setItemsSaving] = useState(false);
  const [error, setError] = useState('');

  const [editingItemId, setEditingItemId] = useState(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [price, setPrice] = useState(0);

  useEffect(() => {
    setProfileCompany(user?.companyName || '');
    setProfileAddress(user?.companyAddress || '');
    setProfileEmail(user?.companyEmail || '');
    setProfilePhone(user?.companyPhone || '');
    setProfileTaxId(user?.companyTaxId || '');
    setDefaultTaxName(user?.invoiceDefaults?.defaultTaxName || 'GST');
    setDefaultTaxRate(Number(user?.invoiceDefaults?.defaultTaxRate || 0));
    setTaxMode(String(user?.invoiceDefaults?.taxMode || 'invoice'));
    setDefaultPaymentTermsDays(Number(user?.invoiceDefaults?.paymentTermsDays || 0));
  }, [user]);

  const loadItems = async () => {
    setItemsLoading(true);
    setError('');
    try {
      const data = await apiListItems(token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || 'Failed to load items');
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => String(a?.description || '').localeCompare(String(b?.description || '')));
  }, [items]);

  const resetItemForm = () => {
    setEditingItemId(null);
    setDescription('');
    setQuantity(1);
    setPrice(0);
  };

  const onEditItem = (it) => {
    setEditingItemId(it._id);
    setDescription(it.description || '');
    setQuantity(Number(it.quantity || 1));
    setPrice(Number(it.price || 0));
    setActive('items');
  };

  const onSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMessage('');
    setError('');
    setProfileSaving(true);
    try {
      const updated = await apiUpdateProfile(token, {
        companyName: profileCompany,
        companyLogoFile: logoFile,
        companyAddress: profileAddress,
        companyEmail: profileEmail,
        companyPhone: profilePhone,
        companyTaxId: profileTaxId,
        defaultTaxName,
        defaultTaxRate,
        taxMode,
        paymentTermsDays: defaultPaymentTermsDays,
      });
      setProfileMessage('Profile updated.');
      // Auth provider will re-fetch /me and refresh cached user.
      if (updated?.companyLogo) {
        // no-op
      }
    } catch (err) {
      setError(err?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const onSaveItem = async (e) => {
    e.preventDefault();
    setError('');
    setItemsSaving(true);
    try {
      const payload = {
        description: description.trim(),
        quantity: Number(quantity || 0),
        price: Number(price || 0),
      };
      if (editingItemId) {
        await apiUpdateItem(token, editingItemId, payload);
      } else {
        await apiCreateItem(token, payload);
      }
      resetItemForm();
      await loadItems();
    } catch (err) {
      setError(err?.message || 'Failed to save item');
    } finally {
      setItemsSaving(false);
    }
  };

  const onDeleteItem = async (id) => {
    setError('');
    try {
      await apiDeleteItem(token, id);
      if (editingItemId === id) resetItemForm();
      await loadItems();
    } catch (err) {
      setError(err?.message || 'Failed to delete item');
    }
  };

  return (
    <div className="space-y-10">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={reduceMotion ? undefined : { duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-8 shadow-soft"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_30%_0%,rgba(34,197,94,0.14),rgba(7,10,18,0))]" />
        <div className="relative space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Control</div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">Settings</h1>
          <p className="max-w-2xl text-sm text-white/65">Profile and catalog controls that keep the invoice flow clean.</p>
        </div>
      </motion.div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="ds-panel overflow-hidden lg:col-span-2">
          <div className="border-b border-white/10 bg-white/5 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Sections</div>
            <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Preferences</div>
            <div className="mt-1 text-sm text-white/60">Keep it tight and purposeful.</div>
          </div>
          <div className="p-3">
            {[
              { key: 'profile', label: 'Business profile' },
              { key: 'items', label: 'Item catalog' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                  active === t.key ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {active === 'profile' ? (
            <div className="ds-panel overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Business</div>
                <div className="mt-2 font-display text-2xl font-semibold tracking-tight">Profile</div>
                <div className="mt-1 text-sm text-white/60">Connected to <span className="text-white/75">PUT /api/users/profile</span>.</div>
              </div>

              <form onSubmit={onSaveProfile} className="space-y-4 p-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/85" htmlFor="companyName">Company name</label>
                  <input
                    id="companyName"
                    className="ds-input"
                    value={profileCompany}
                    onChange={(e) => setProfileCompany(e.target.value)}
                    placeholder="Your company"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/85" htmlFor="companyAddress">Business address</label>
                  <input
                    id="companyAddress"
                    className="ds-input"
                    value={profileAddress}
                    onChange={(e) => setProfileAddress(e.target.value)}
                    placeholder="Street, City, State"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="companyEmail">Business email</label>
                    <input
                      id="companyEmail"
                      className="ds-input"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      placeholder="billing@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="companyPhone">Business phone</label>
                    <input
                      id="companyPhone"
                      className="ds-input"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+91 ..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/85" htmlFor="companyTaxId">Business tax ID (optional)</label>
                  <input
                    id="companyTaxId"
                    className="ds-input"
                    value={profileTaxId}
                    onChange={(e) => setProfileTaxId(e.target.value)}
                    placeholder="GSTIN / VAT ID"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white/85" htmlFor="logo">Company logo</label>
                  <input
                    id="logo"
                    className="ds-input h-auto py-2"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  />
                  <div className="text-xs text-white/55">Uploaded to <span className="text-white/75">/uploads</span>.</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Tax defaults</div>
                  <div className="mt-2 text-sm font-semibold text-white/85">Set once, reuse everywhere</div>
                  <div className="mt-1 text-sm text-white/60">This helps you apply GST/VAT consistently on new invoices.</div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/85" htmlFor="defaultTaxName">Tax name</label>
                      <input
                        id="defaultTaxName"
                        className="ds-input"
                        value={defaultTaxName}
                        onChange={(e) => setDefaultTaxName(e.target.value)}
                        placeholder="GST"
                      />
                      <div className="text-xs text-white/55">Shown on the invoice (e.g., GST, VAT, Sales Tax).</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/85" htmlFor="defaultTaxRate">Tax rate (%)</label>
                      <input
                        id="defaultTaxRate"
                        className="ds-input"
                        type="number"
                        min="0"
                        max="100"
                        value={defaultTaxRate}
                        onChange={(e) => setDefaultTaxRate(e.target.value)}
                      />
                      <div className="text-xs text-white/55">Use 0 for tax-exempt or not applicable.</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/85" htmlFor="taxMode">Tax application</label>
                      <select id="taxMode" className="ds-input" value={taxMode} onChange={(e) => setTaxMode(e.target.value)}>
                        <option value="invoice">Invoice-level (on subtotal)</option>
                        <option value="line">Per line item (advanced)</option>
                      </select>
                      <div className="text-xs text-white/55">Default is invoice-level (simpler for freelancers).</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/85" htmlFor="defaultPaymentTermsDays">Default payment terms (days)</label>
                      <input
                        id="defaultPaymentTermsDays"
                        className="ds-input"
                        type="number"
                        min="0"
                        max="365"
                        value={defaultPaymentTermsDays}
                        onChange={(e) => setDefaultPaymentTermsDays(e.target.value)}
                      />
                      <div className="text-xs text-white/55">Used as the starting point for due date suggestion.</div>
                    </div>
                  </div>
                </div>

                <button className="ds-btn-primary w-full" type="submit" disabled={profileSaving}>
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </button>

                {profileMessage ? (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {profileMessage}
                  </div>
                ) : null}
              </form>
            </div>
          ) : null}

          {active === 'items' ? (
            <div className="grid gap-6 lg:grid-cols-5">
              <div className="ds-panel overflow-hidden lg:col-span-2">
                <div className="border-b border-white/10 bg-white/5 p-6">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Catalog</div>
                  <div className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {editingItemId ? 'Edit item' : 'New item'}
                  </div>
                  <div className="mt-1 text-sm text-white/60">These items power invoice totals.</div>
                </div>

                <form onSubmit={onSaveItem} className="space-y-4 p-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-white/85" htmlFor="desc">Description</label>
                    <input id="desc" className="ds-input" value={description} onChange={(e) => setDescription(e.target.value)} required />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/85" htmlFor="qty">Quantity</label>
                      <input
                        id="qty"
                        className="ds-input"
                        type="number"
                        min="0"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-white/85" htmlFor="price">Price</label>
                      <input
                        id="price"
                        className="ds-input"
                        type="number"
                        min="0"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Preview</div>
                    <div className="mt-2 text-sm font-semibold text-white/85">{description || '—'}</div>
                    <div className="mt-1 text-xs text-white/55">
                      Qty <span className="tabular-nums">{Number(quantity || 0)}</span> · Price{' '}
                      <span className="tabular-nums">{money.formatFromInr(price)}</span>
                    </div>
                    <div className="mt-2 text-sm font-semibold tabular-nums text-white/85">
                      Line total: {money.formatFromInr(Number(quantity || 0) * Number(price || 0))}
                    </div>
                  </div>

                  <button className="ds-btn-primary w-full" type="submit" disabled={itemsSaving}>
                    {itemsSaving ? 'Saving…' : editingItemId ? 'Save item' : 'Create item'}
                  </button>

                  {editingItemId ? (
                    <button type="button" className="ds-btn-secondary w-full" onClick={resetItemForm}>
                      Cancel
                    </button>
                  ) : null}
                </form>
              </div>

              <div className="ds-panel overflow-hidden lg:col-span-3">
                <div className="flex items-end justify-between gap-6 border-b border-white/10 bg-white/5 p-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">Items</div>
                    <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Catalog</h2>
                    <p className="mt-1 text-sm text-white/60">Connected to <span className="text-white/75">/api/items</span>.</p>
                  </div>
                  <div className="text-xs text-white/55">{itemsLoading ? 'Syncing…' : `${sortedItems.length} total`}</div>
                </div>

                <div className="divide-y divide-white/10">
                  {itemsLoading ? (
                    <div className="p-6 text-sm text-white/60">Loading…</div>
                  ) : sortedItems.length ? (
                    sortedItems.map((it) => (
                      <div key={it._id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white/85 truncate">{it.description}</div>
                          <div className="mt-1 text-xs text-white/55">
                            Qty <span className="tabular-nums">{it.quantity}</span> · Price{' '}
                            <span className="tabular-nums">{money.formatFromInr(it.price)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" className="ds-btn-secondary h-10 px-3" onClick={() => onEditItem(it)}>
                            Edit
                          </button>
                          <button type="button" className="ds-btn-secondary h-10 px-3" onClick={() => onDeleteItem(it._id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-sm text-white/60">No items found. Create one to use in invoices.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Settings;
