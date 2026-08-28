import { useState, useRef } from 'react';
import { RotateCcw, Building2, Save, Database, AlertTriangle, Camera, KeyRound, Tag, Calendar, Plus, X, ImageIcon, MapPin, Phone, Mail, Users, UserCog, Trash2, Edit2, Power, ShieldCheck, Palette, Lock, Eye, EyeOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import type { AppSettings } from '@/lib/types';
import type { StaffUser, PermissionEntry, PermissionModule, ModuleAccess } from '@/lib/types';
import { ALL_PERMISSION_MODULES, defaultPermissionsForRole, updatePermission, serializePermissions } from '@/lib/permissions';
import { Card, Button, SectionTitle, Input, Select, Modal, Badge } from '@/components/ui';

export function SettingsModule() {
  const { data, settings, saveProfile, saveSettings, reset, replaceAll } = useStore();
  const { isAdmin, user, staffUsers, staffLoading, createStaffUser, updateStaffUser, removeStaffUser, updateOwnCredentials } = useAuth();
  const [farmName, setFarmName] = useState(data.farmName);
  const [owner, setOwner] = useState(data.owner);
  const [profilePhoto, setProfilePhoto] = useState(data.profilePhoto || '');
  const [logo, setLogo] = useState(data.logo || '');
  const [address, setAddress] = useState(data.address || '');
  const [phone, setPhone] = useState(data.phone || '');
  const [email, setEmail] = useState(data.email || '');
  const [loginBgUrl, setLoginBgUrl] = useState(data.loginBgUrl || '');
  const [dashboardBgUrl, setDashboardBgUrl] = useState(data.dashboardBgUrl || '');
  const [loginBrightness, setLoginBrightness] = useState(data.loginBgBrightness ?? 1);
  const [loginOverlay, setLoginOverlay] = useState(data.loginBgOverlay ?? 0.5);
  const [loginBlur, setLoginBlur] = useState(data.loginBgBlur ?? 0);
  const [dashBrightness, setDashBrightness] = useState(data.dashboardBgBrightness ?? 1);
  const [dashOverlay, setDashOverlay] = useState(data.dashboardBgOverlay ?? 0.1);
  const [dashBlur, setDashBlur] = useState(data.dashboardBgBlur ?? 0);
  const [confirmReset, setConfirmReset] = useState(false);

  // Own credentials
  const [ownUsername, setOwnUsername] = useState(user?.username || '');
  const [ownNewPw, setOwnNewPw] = useState('');
  const [ownConfirmPw, setOwnConfirmPw] = useState('');
  const [ownSaving, setOwnSaving] = useState(false);

  // User management modal
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [formFullName, setFormFullName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'dataentry'>('dataentry');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formPermissions, setFormPermissions] = useState<PermissionEntry[]>([]);
  const [userSaving, setUserSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StaffUser | null>(null);

  // Category management
  const [newCropCat, setNewCropCat] = useState('');
  const [newNurseryCat, setNewNurseryCat] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('');

  // Season management
  const [newSeason, setNewSeason] = useState('');
  const [newYear, setNewYear] = useState('');

  const photoRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  const s: AppSettings | null = settings;

  const handleImageUpload = (file: File, cb: (dataUrl: string) => void) => {
    if (file.size > 500_000) { alert('Image must be under 500KB'); return; }
    const reader = new FileReader();
    reader.onload = () => cb(String(reader.result));
    reader.readAsDataURL(file);
  };

  const saveProfileData = () => {
    saveProfile(farmName, owner, profilePhoto || undefined, logo || undefined, address || undefined, phone || undefined, email || undefined, loginBgUrl || undefined, dashboardBgUrl || undefined, loginBrightness, loginOverlay, loginBlur, dashBrightness, dashOverlay, dashBlur);
  };

  const submitOwnCredentials = async () => {
    if (ownUsername.trim().length < 2) { alert('Username must be at least 2 characters'); return; }
    if (ownNewPw || ownConfirmPw) {
      if (ownNewPw.length < 3) { alert('Password must be at least 3 characters'); return; }
      if (ownNewPw !== ownConfirmPw) { alert('Passwords do not match'); return; }
    }
    setOwnSaving(true);
    const ok = await updateOwnCredentials(ownUsername.trim(), ownNewPw || undefined);
    if (ok) { setOwnNewPw(''); setOwnConfirmPw(''); }
    setOwnSaving(false);
  };

  // User management helpers
  const openCreateUser = () => {
    setEditingUser(null);
    setFormFullName('');
    setFormUsername('');
    setFormPassword('');
    setFormRole('dataentry');
    setFormStatus('Active');
    setFormPermissions(defaultPermissionsForRole('dataentry'));
    setUserModalOpen(true);
  };

  const openEditUser = (u: StaffUser) => {
    setEditingUser(u);
    setFormFullName(u.full_name);
    setFormUsername(u.username);
    setFormPassword(u.password);
    setFormRole(u.role);
    setFormStatus(u.status);
    setFormPermissions(u.permissions ? serializePermissions(u.permissions) : defaultPermissionsForRole(u.role));
    setUserModalOpen(true);
  };

  const submitUser = async () => {
    if (!formFullName.trim()) { alert('Full name is required'); return; }
    if (!formUsername.trim()) { alert('Username is required'); return; }
    if (!formPassword.trim()) { alert('Password is required'); return; }
    const usernameTaken = staffUsers.some((u) => u.username.toLowerCase() === formUsername.trim().toLowerCase() && u.id !== editingUser?.id);
    if (usernameTaken) { alert('This username is already taken'); return; }
    setUserSaving(true);
    if (editingUser) {
      await updateStaffUser(editingUser.id, {
        full_name: formFullName.trim(),
        username: formUsername.trim(),
        password: formPassword,
        role: formRole,
        status: formStatus,
        permissions: formRole === 'admin' ? undefined : formPermissions,
      });
    } else {
      await createStaffUser({
        full_name: formFullName.trim(),
        username: formUsername.trim(),
        password: formPassword,
        role: formRole,
        status: formStatus,
        permissions: formRole === 'admin' ? undefined : formPermissions,
      });
    }
    setUserSaving(false);
    setUserModalOpen(false);
  };

  const toggleStatus = async (u: StaffUser) => {
    const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
    await updateStaffUser(u.id, { status: newStatus });
  };

  const confirmDeleteUser = async () => {
    if (!confirmDelete) return;
    await removeStaffUser(confirmDelete.id);
    setConfirmDelete(null);
  };

  const updateSettingsField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!s) return;
    saveSettings({ ...s, [key]: value });
  };

  const addCropCat = () => { if (!s || !newCropCat.trim()) return; updateSettingsField('cropExpenseCategories', [...s.cropExpenseCategories, newCropCat.trim()]); setNewCropCat(''); };
  const removeCropCat = (cat: string) => { if (!s) return; updateSettingsField('cropExpenseCategories', s.cropExpenseCategories.filter((c) => c !== cat)); };
  const addNurseryCat = () => { if (!s || !newNurseryCat.trim()) return; updateSettingsField('nurseryCostCategories', [...s.nurseryCostCategories, newNurseryCat.trim()]); setNewNurseryCat(''); };
  const removeNurseryCat = (cat: string) => { if (!s) return; updateSettingsField('nurseryCostCategories', s.nurseryCostCategories.filter((c) => c !== cat)); };
  const addExpenseCat = () => { if (!s || !newExpenseCat.trim()) return; updateSettingsField('expenseCategories', [...s.expenseCategories, newExpenseCat.trim()]); setNewExpenseCat(''); };
  const removeExpenseCat = (cat: string) => { if (!s) return; updateSettingsField('expenseCategories', s.expenseCategories.filter((c) => c !== cat)); };
  const addSeason = () => { if (!s || !newSeason.trim()) return; updateSettingsField('seasons', [...s.seasons, newSeason.trim()]); setNewSeason(''); };
  const removeSeason = (season: string) => { if (!s) return; updateSettingsField('seasons', s.seasons.filter((x) => x !== season)); };
  const addYear = () => { if (!s || !newYear.trim()) return; updateSettingsField('seasonYears', [...s.seasonYears, newYear.trim()]); setNewYear(''); };
  const removeYear = (year: string) => { if (!s) return; updateSettingsField('seasonYears', s.seasonYears.filter((x) => x !== year)); };

  const counts = [
    { label: 'Crops', n: data.crops.length },
    { label: 'Crop expenses', n: data.cropExpenses.length },
    { label: 'Harvests', n: data.cropHarvests.length },
    { label: 'Nursery batches', n: data.nurseryBatches.length },
    { label: 'Nursery costs', n: data.nurseryCosts.length },
    { label: 'Nursery sales', n: data.nurserySales.length },
    { label: 'Nursery transfers', n: data.nurseryTransfers.length },
    { label: 'Workers', n: data.workers.length },
    { label: 'Attendance', n: data.attendance.length },
    { label: 'Vouchers', n: data.vouchers.length },
    { label: 'Ledger entries', n: data.ledger.length },
    { label: 'Expenses', n: data.expenses.length },
  ];

  const doReset = () => {
    reset();
    setFarmName(''); setOwner(''); setProfilePhoto(''); setLogo(''); setAddress(''); setPhone(''); setEmail('');
    setLoginBgUrl(''); setDashboardBgUrl('');
    setLoginBrightness(1); setLoginOverlay(0.5); setLoginBlur(0);
    setDashBrightness(1); setDashOverlay(0.1); setDashBlur(0);
    setConfirmReset(false);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `farm_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        replaceAll(parsed);
        setFarmName(parsed.farmName || farmName);
        setOwner(parsed.owner || owner);
      } catch { /* ignore */ }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Farm Profile with photo & logo */}
      <Card className="p-5">
        <SectionTitle title="Farm Profile" subtitle="Organization details, contact info, photo & logo" icon={<Building2 size={18} />} />
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex gap-4">
            <div className="text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-2 border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center">
                  {profilePhoto ? <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" /> : <Camera size={28} className="text-neutral-300" />}
                </div>
                <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, setProfilePhoto); e.target.value = ''; }} />
                <button onClick={() => photoRef.current?.click()} className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md hover:bg-primary-700 transition" aria-label="Upload photo">
                  <Camera size={15} />
                </button>
              </div>
              <div className="text-xs text-neutral-500 mt-2">Profile photo</div>
            </div>
            <div className="text-center">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl border-2 border-neutral-200 overflow-hidden bg-primary-900 flex items-center justify-center">
                  {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover" /> : <ImageIcon size={28} className="text-primary-300" />}
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, setLogo); e.target.value = ''; }} />
                <button onClick={() => logoRef.current?.click()} className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md hover:bg-primary-700 transition" aria-label="Upload logo">
                  <ImageIcon size={15} />
                </button>
              </div>
              <div className="text-xs text-neutral-500 mt-2">Logo</div>
            </div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Farm / company name" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
              <Input label="Proprietor / owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+94 77 123 4567" />
              <Input label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="farm@example.com" />
            </div>
            <Input label="Farm address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="No. 12, Farm Road, Idallawa, Sri Lanka" />
            <div className="flex items-center gap-3">
              <Button icon={<Save size={15} />} onClick={saveProfileData}>Save profile</Button>
              {profilePhoto && <Button variant="ghost" size="sm" onClick={() => setProfilePhoto('')}>Remove photo</Button>}
              {logo && <Button variant="ghost" size="sm" onClick={() => setLogo('')}>Remove logo</Button>}
            </div>
          </div>
        </div>
      </Card>

      {/* Branding & Appearance */}
      <Card className="p-5">
        <SectionTitle title="Branding & Appearance" subtitle="Customize background images with brightness, overlay & blur controls" icon={<Palette size={18} />} />
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-600 text-neutral-700">Login Page Background</div>
            <Input label="Background image URL" value={loginBgUrl} onChange={(e) => setLoginBgUrl(e.target.value)} placeholder="https://example.com/farm-photo.jpg" />
            <p className="text-xs text-neutral-500">Paste a direct image URL. Leave blank to use the default paddy field photo.</p>
            {loginBgUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-200">
                <img src={loginBgUrl} alt="Login background preview" className="w-full h-full object-cover" style={{ filter: `brightness(${loginBrightness}) blur(${loginBlur}px)` }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 bg-black pointer-events-none" style={{ opacity: loginOverlay }} />
                <div className="absolute bottom-2 left-2 z-10"><span className="text-xs text-white font-600 drop-shadow">Live preview</span></div>
              </div>
            )}
            <SliderControl label="Brightness" value={loginBrightness} min={0.2} max={1} step={0.05} onChange={setLoginBrightness} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderControl label="Dark overlay" value={loginOverlay} min={0} max={0.9} step={0.05} onChange={setLoginOverlay} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderControl label="Blur effect" value={loginBlur} min={0} max={20} step={1} onChange={setLoginBlur} format={(v) => v === 0 ? 'Off' : `${v}px`} />
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => { setLoginBgUrl(''); setLoginBrightness(1); setLoginOverlay(0.5); setLoginBlur(0); }}>Reset to Default</Button>
          </div>
          <div className="space-y-3">
            <div className="text-sm font-600 text-neutral-700">Dashboard Background</div>
            <Input label="Background image URL" value={dashboardBgUrl} onChange={(e) => setDashboardBgUrl(e.target.value)} placeholder="https://example.com/dashboard-bg.jpg" />
            <p className="text-xs text-neutral-500">Displayed behind the dashboard content. Adjust opacity for a watermark/glass-morphism effect.</p>
            {dashboardBgUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-neutral-200 bg-white">
                <img src={dashboardBgUrl} alt="Dashboard background preview" className="w-full h-full object-cover" style={{ filter: `brightness(${dashBrightness}) blur(${dashBlur}px)`, opacity: dashOverlay }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute bottom-2 left-2 z-10"><span className="text-xs text-neutral-700 font-600">Live preview ({Math.round(dashOverlay * 100)}% opacity)</span></div>
              </div>
            )}
            <SliderControl label="Brightness" value={dashBrightness} min={0.2} max={1} step={0.05} onChange={setDashBrightness} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderControl label="Visibility (opacity)" value={dashOverlay} min={0} max={1} step={0.05} onChange={setDashOverlay} format={(v) => `${Math.round(v * 100)}%`} />
            <SliderControl label="Blur effect" value={dashBlur} min={0} max={20} step={1} onChange={setDashBlur} format={(v) => v === 0 ? 'Off' : `${v}px`} />
            <Button size="sm" variant="ghost" icon={<RotateCcw size={13} />} onClick={() => { setDashboardBgUrl(''); setDashBrightness(1); setDashOverlay(0.1); setDashBlur(0); }}>Reset to Default</Button>
          </div>
        </div>
        <div className="mt-4">
          <Button icon={<Save size={15} />} onClick={saveProfileData}>Save appearance</Button>
        </div>
      </Card>

      {/* Contact info display */}
      {(data.address || data.phone || data.email) && (
        <Card className="p-5">
          <SectionTitle title="Contact Information" subtitle="Current contact details on file" icon={<MapPin size={18} />} />
          <div className="grid sm:grid-cols-3 gap-4">
            <ContactItem icon={<MapPin size={16} />} label="Address" value={data.address} />
            <ContactItem icon={<Phone size={16} />} label="Phone" value={data.phone} />
            <ContactItem icon={<Mail size={16} />} label="Email" value={data.email} />
          </div>
        </Card>
      )}

      {/* My Credentials — update own username & password */}
      <Card className="p-5">
        <SectionTitle title="My Credentials" subtitle="Update your own login username and password" icon={<KeyRound size={18} />} />
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="space-y-3">
            <Input label="Username" value={ownUsername} onChange={(e) => setOwnUsername(e.target.value)} />
            <Input label="New password" type="password" value={ownNewPw} onChange={(e) => setOwnNewPw(e.target.value)} placeholder="Leave blank to keep current" />
            <Input label="Confirm new password" type="password" value={ownConfirmPw} onChange={(e) => setOwnConfirmPw(e.target.value)} placeholder="Leave blank to keep current" />
            <Button icon={<KeyRound size={15} />} onClick={submitOwnCredentials} disabled={ownSaving}>
              {ownSaving ? 'Saving…' : 'Update credentials'}
            </Button>
          </div>
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-100 text-sm space-y-2">
            <div className="font-600 text-neutral-700">Account info</div>
            <div className="text-neutral-600">Signed in as: <strong>{user?.displayName}</strong></div>
            <div className="text-neutral-600">Role: <strong>{user?.role === 'admin' ? 'Administrator' : 'Data Entry'}</strong></div>
            <div className="text-xs text-neutral-500 mt-2">Update your username or password here. Leave the password fields blank if you only want to change your username.</div>
          </div>
        </div>
      </Card>

      {/* User Management — admin only */}
      {isAdmin && (
        <Card className="p-5">
          <SectionTitle
            title="User Management"
            subtitle="Create, edit, and manage staff accounts"
            icon={<Users size={18} />}
            action={<Button size="sm" icon={<Plus size={14} />} onClick={openCreateUser}>Add user</Button>}
          />
          {staffLoading ? (
            <div className="py-8 text-center text-sm text-neutral-500">Loading users…</div>
          ) : staffUsers.length === 0 ? (
            <div className="py-8 text-center text-sm text-neutral-500">No users found. Click "Add user" to create one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-600 text-neutral-500 uppercase tracking-wide border-b border-neutral-200">
                    <th className="py-2 px-3">Full Name</th>
                    <th className="py-2 px-3">Username</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {staffUsers.map((u) => (
                    <tr key={u.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-700 shrink-0">
                            {u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-600 text-neutral-800">{u.full_name}</span>
                          {u.id === user?.id && <Badge tone="blue" className="ml-1">You</Badge>}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-neutral-600">{u.username}</td>
                      <td className="py-2.5 px-3">
                        {u.role === 'admin'
                          ? <Badge tone="green"><ShieldCheck size={12} /> Admin</Badge>
                          : <Badge tone="neutral"><UserCog size={12} /> Data Entry</Badge>}
                        {u.role === 'dataentry' && u.permissions && (
                          <div className="text-[10px] text-neutral-400 mt-1">
                            {u.permissions.filter((p) => p.access !== 'none').length} modules accessible
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {u.status === 'Active'
                          ? <Badge tone="green">Active</Badge>
                          : <Badge tone="red">Inactive</Badge>}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditUser(u)} className="p-1.5 rounded-lg text-neutral-500 hover:text-accent-600 hover:bg-accent-50 transition" title="Edit">
                            <Edit2 size={15} />
                          </button>
                          <button onClick={() => toggleStatus(u)} className="p-1.5 rounded-lg text-neutral-500 hover:text-secondary-600 hover:bg-secondary-50 transition" title={u.status === 'Active' ? 'Deactivate' : 'Activate'}>
                            <Power size={15} />
                          </button>
                          {u.id !== user?.id && (
                            <button onClick={() => setConfirmDelete(u)} className="p-1.5 rounded-lg text-neutral-500 hover:text-error-600 hover:bg-error-50 transition" title="Remove">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Custom categories */}
      {s && (
        <Card className="p-5">
          <SectionTitle title="Custom Categories" subtitle="Add or remove categories used across modules" icon={<Tag size={18} />} />
          <div className="grid lg:grid-cols-3 gap-6">
            <CategoryEditor title="Crop Expense Categories" categories={s.cropExpenseCategories} newValue={newCropCat} setNewValue={setNewCropCat} onAdd={addCropCat} onRemove={removeCropCat} />
            <CategoryEditor title="Nursery Cost Categories" categories={s.nurseryCostCategories} newValue={newNurseryCat} setNewValue={setNewNurseryCat} onAdd={addNurseryCat} onRemove={removeNurseryCat} />
            <CategoryEditor title="General Expense Categories" categories={s.expenseCategories} newValue={newExpenseCat} setNewValue={setNewExpenseCat} onAdd={addExpenseCat} onRemove={removeExpenseCat} />
          </div>
        </Card>
      )}

      {/* Season & year management */}
      {s && (
        <Card className="p-5">
          <SectionTitle title="Seasons & Years" subtitle="Manage cropping seasons and years for filtering" icon={<Calendar size={18} />} />
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-600 text-neutral-700 mb-2">Seasons</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {s.seasons.map((season) => (
                  <span key={season} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 text-sm font-600">
                    {season}
                    <button onClick={() => removeSeason(season)} className="text-primary-400 hover:text-error-600"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newSeason} onChange={(e) => setNewSeason(e.target.value)} placeholder="e.g. Yala" />
                <Button size="sm" icon={<Plus size={14} />} onClick={addSeason}>Add</Button>
              </div>
            </div>
            <div>
              <div className="text-sm font-600 text-neutral-700 mb-2">Years</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {s.seasonYears.map((year) => (
                  <span key={year} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-50 text-accent-700 text-sm font-600">
                    {year}
                    <button onClick={() => removeYear(year)} className="text-accent-400 hover:text-error-600"><X size={14} /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newYear} onChange={(e) => setNewYear(e.target.value)} placeholder="e.g. 2027" />
                <Button size="sm" icon={<Plus size={14} />} onClick={addYear}>Add</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <SectionTitle title="Data Summary" subtitle="Records currently stored in the database" icon={<Database size={18} />} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {counts.map((c) => (
            <div key={c.label} className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div className="text-xs text-neutral-500">{c.label}</div>
              <div className="font-display text-xl font-800 text-neutral-900 mt-0.5">{c.n}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" icon={<Database size={15} />} onClick={exportBackup}>Backup (JSON)</Button>
          <label>
            <input type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ''; }} />
            <span className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-600 cursor-pointer"><Database size={15} /> Restore backup</span>
          </label>
        </div>
      </Card>

      <Card className="p-5 border-error-200">
        <SectionTitle title="Danger Zone" subtitle="Clear all data and start fresh" icon={<AlertTriangle size={18} />} />
        <div className="flex items-center justify-between p-4 rounded-xl bg-error-50 border border-error-200">
          <div>
            <div className="font-600 text-error-800 text-sm">Clear all data</div>
            <div className="text-xs text-error-700/80">This wipes all records and starts the app with empty data. Consider backing up first.</div>
          </div>
          <Button variant="danger" icon={<RotateCcw size={15} />} onClick={() => setConfirmReset(true)}>Reset</Button>
        </div>
      </Card>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset all data?" size="sm">
        <p className="text-sm text-neutral-700">This will permanently delete all records and start the app with empty data. This cannot be undone.</p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>Cancel</Button>
          <Button variant="danger" onClick={doReset}>Yes, reset</Button>
        </div>
      </Modal>

      {/* User create/edit modal */}
      <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title={editingUser ? 'Edit User' : 'Add New User'} size="md">
        <div className="space-y-4">
          <Input label="Full Name" value={formFullName} onChange={(e) => setFormFullName(e.target.value)} placeholder="e.g. John Silva" />
          <Input label="Username" value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="e.g. jsilva" />
          <Input label="Password" type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Enter password" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Role" value={formRole} onChange={(e) => { const r = e.target.value as 'admin' | 'dataentry'; setFormRole(r); if (r === 'admin') setFormPermissions(defaultPermissionsForRole('admin')); }}>
              <option value="admin">Admin</option>
              <option value="dataentry">Data Entry</option>
            </Select>
            <Select label="Status" value={formStatus} onChange={(e) => setFormStatus(e.target.value as 'Active' | 'Inactive')}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </Select>
          </div>
          {formRole === 'dataentry' && (
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={14} className="text-neutral-500" />
                <span className="text-sm font-600 text-neutral-700">Module Access Permissions</span>
              </div>
              <div className="border border-neutral-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-600 text-neutral-500 uppercase">
                      <th className="text-left py-2 px-3">Module</th>
                      <th className="text-center py-2 px-2 w-20">None</th>
                      <th className="text-center py-2 px-2 w-20">View</th>
                      <th className="text-center py-2 px-2 w-20">Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ALL_PERMISSION_MODULES.map((m) => {
                      const cur = formPermissions.find((p) => p.module === m.key)?.access || 'none';
                      return (
                        <tr key={m.key} className="border-b border-neutral-100 last:border-0">
                          <td className="py-2 px-3 text-neutral-700 text-xs">{m.label}</td>
                          {(['none', 'view', 'edit'] as ModuleAccess[]).map((acc) => (
                            <td key={acc} className="text-center py-2 px-2">
                              <button
                                type="button"
                                onClick={() => setFormPermissions((prev) => updatePermission(prev, m.key as PermissionModule, acc))}
                                className={`w-6 h-6 rounded-full flex items-center justify-center transition ${cur === acc ? (acc === 'none' ? 'bg-error-100 text-error-600' : acc === 'view' ? 'bg-accent-100 text-accent-600' : 'bg-success-100 text-success-600') : 'bg-neutral-100 text-neutral-300 hover:bg-neutral-200'}`}
                                aria-label={`${m.label}: ${acc}`}
                              >
                                {acc === 'none' && <Lock size={12} />}
                                {acc === 'view' && <Eye size={12} />}
                                {acc === 'edit' && <Edit2 size={12} />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-neutral-500 mt-1">Controls what this user can see and edit. Admins always have full access.</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setUserModalOpen(false)}>Cancel</Button>
            <Button onClick={submitUser} disabled={userSaving}>
              {userSaving ? 'Saving…' : editingUser ? 'Save changes' : 'Create user'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove user?" size="sm">
        <p className="text-sm text-neutral-700">
          Are you sure you want to remove <strong>{confirmDelete?.full_name}</strong> ({confirmDelete?.username})? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteUser}>Yes, remove</Button>
        </div>
      </Modal>
    </div>
  );
}

function CategoryEditor({ title, categories, newValue, setNewValue, onAdd, onRemove }: {
  title: string; categories: string[]; newValue: string; setNewValue: (v: string) => void; onAdd: () => void; onRemove: (cat: string) => void;
}) {
  return (
    <div>
      <div className="text-sm font-600 text-neutral-700 mb-2">{title}</div>
      <div className="space-y-1.5 mb-3">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-100">
            <span className="text-sm text-neutral-700">{cat}</span>
            <button onClick={() => onRemove(cat)} className="text-neutral-400 hover:text-error-600"><X size={14} /></button>
          </div>
        ))}
        {categories.length === 0 && <div className="text-xs text-neutral-400">No categories yet</div>}
      </div>
      <div className="flex gap-2">
        <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder="Add new…" />
        <Button size="sm" icon={<Plus size={14} />} onClick={onAdd}>Add</Button>
      </div>
    </div>
  );
}

function ContactItem({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
      <span className="text-primary-600 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs font-600 text-neutral-500 uppercase tracking-wide">{label}</div>
        <div className="text-sm text-neutral-800 mt-0.5 break-words">{value || <span className="text-neutral-400">Not set</span>}</div>
      </div>
    </div>
  );
}

function SliderControl({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-600 text-neutral-600">{label}</span>
        <span className="text-xs font-700 text-neutral-800 tabular-nums">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 accent-primary-600"
      />
    </div>
  );
}
