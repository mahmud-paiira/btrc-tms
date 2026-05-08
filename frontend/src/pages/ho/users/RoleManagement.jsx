import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';

const PERMISSION_CATEGORIES = [
  { key: 'centers', label: 'Center Permissions' },
  { key: 'courses', label: 'Course Permissions' },
  { key: 'trainers', label: 'Trainer Permissions' },
  { key: 'assessors', label: 'Assessor Permissions' },
  { key: 'trainees', label: 'Trainee Permissions' },
  { key: 'financial', label: 'Financial Permissions' },
  { key: 'reports', label: 'Report Permissions' },
  { key: 'users', label: 'User Management' },
];

export default function RoleManagement({ show, onClose }) {
  const { t } = useTranslation();
  const [roles, setRoles] = useState([]);
  const [availablePerms, setAvailablePerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (show) {
      fetchRoles();
      fetchPermissions();
    }
  }, [show]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await hoService.listRoles();
      setRoles(res.data.results || res.data || []);
    } catch { toast.error(t('roles.loadError', 'ভূমিকা লোড ব্যর্থ')); }
    finally { setLoading(false); }
  };

  const fetchPermissions = async () => {
    try {
      const res = await hoService.listAvailablePermissions();
      setAvailablePerms(res.data || []);
    } catch { /* silent */ }
  };

  const openEdit = (role) => {
    setEditRole(role);
    setForm({ name: role.name, description: role.description || '' });
    setSelectedPerms(role.permissions || []);
    setShowForm(true);
  };

  const openCreate = () => {
    setEditRole(null);
    setForm({ name: '', description: '' });
    setSelectedPerms([]);
    setShowForm(true);
  };

  const togglePermission = (permKey) => {
    setSelectedPerms(prev =>
      prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]
    );
  };

  const toggleCategory = (categoryKey, children) => {
    const catPerms = children.map(c => c.key);
    const allSelected = catPerms.every(p => selectedPerms.includes(p));
    if (allSelected) {
      setSelectedPerms(prev => prev.filter(p => !catPerms.includes(p)));
    } else {
      setSelectedPerms(prev => [...new Set([...prev, ...catPerms])]);
    }
  };

  const saveRole = async () => {
    if (!form.name) { toast.warning(t('roles.nameRequired', 'নাম আবশ্যক')); return; }
    setSaving(true);
    try {
      if (editRole) {
        await hoService.updateRole(editRole.id, form);
        await hoService.updateRolePermissions(editRole.id, { permissions: selectedPerms });
        toast.success(t('roles.updated', 'হালনাগাদ করা হয়েছে'));
      } else {
        await hoService.createRole({ ...form, permissions: selectedPerms });
        toast.success(t('roles.created', 'তৈরি করা হয়েছে'));
      }
      setShowForm(false);
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.detail || t('roles.saveError', 'সংরক্ষণ ব্যর্থ'));
    } finally { setSaving(false); }
  };

  const deleteRole = async (role) => {
    if (role.is_system) { toast.warning(t('roles.cannotDelete', 'সিস্টেম ভূমিকা মুছা যাবে না')); return; }
    if (!window.confirm(t('roles.confirmDelete', `${role.name} মুছবেন?`))) return;
    try {
      await hoService.deleteRole(role.id);
      toast.success(t('roles.deleted', 'মুছে ফেলা হয়েছে'));
      fetchRoles();
    } catch { toast.error(t('roles.deleteError', 'মুছতে ব্যর্থ')); }
  };

  return (
    <Modal show={show} onHide={onClose} centered size="xl">
      <Modal.Header closeButton>
        <Modal.Title><i className="bi bi-shield-lock me-2"></i>{t('roles.title', 'ভূমিকা ও অনুমতি')}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {!showForm ? (
          <div>
            <div className="d-flex justify-content-end mb-3">
              <button className="btn btn-primary btn-sm" onClick={openCreate}>
                <i className="bi bi-plus-lg me-1"></i>{t('roles.add', 'নতুন ভূমিকা')}
              </button>
            </div>
            {loading ? (
              <div className="text-center py-4"><div className="spinner-border spinner-border-sm" /></div>
            ) : roles.length === 0 ? (
              <p className="text-secondary text-center py-4">{t('common.noData', 'কোন তথ্য নেই')}</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead className="table-light">
                    <tr>
                      <th style={{ fontSize: 13 }}>{t('roles.name', 'নাম')}</th>
                      <th style={{ fontSize: 13 }}>{t('roles.description', 'বিবরণ')}</th>
                      <th style={{ fontSize: 13 }}>{t('roles.permissions', 'অনুমতি')}</th>
                      <th style={{ fontSize: 13 }}>{t('roles.type', 'ধরণ')}</th>
                      <th style={{ fontSize: 13 }}>{t('common.actions', 'অপশন')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map(r => (
                      <tr key={r.id}>
                        <td className="fw-semibold" style={{ fontSize: 13 }}>{r.name}</td>
                        <td style={{ fontSize: 13 }}>{r.description || '-'}</td>
                        <td><span className="badge bg-primary">{r.permission_count || 0}</span></td>
                        <td>
                          <span className={`badge ${r.is_system ? 'bg-warning' : 'bg-info'}`}>
                            {r.is_system ? t('roles.system', 'সিস্টেম') : t('roles.custom', 'কাস্টম')}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(r)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => deleteRole(r)}>
                              <i className="bi bi-trash"></i>
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
        ) : (
          <div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label className="fw-semibold mb-1">{t('roles.name', 'নাম')} *</label>
                <input className="form-control" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-md-6">
                <label className="fw-semibold mb-1">{t('roles.description', 'বিবরণ')}</label>
                <input className="form-control" value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            <h6 className="fw-bold mb-2">{t('roles.permissions', 'অনুমতি')}</h6>
            <div className="row g-2" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {(availablePerms.length > 0 ? availablePerms : PERMISSION_CATEGORIES.map(c => ({ ...c, children: [] }))).map((cat) => {
                const children = cat.children || [];
                const catAllSelected = children.length > 0 && children.every(c => selectedPerms.includes(c.key));
                const catSomeSelected = children.some(c => selectedPerms.includes(c.key));
                return (
                  <div key={cat.key} className="col-6">
                    <div className="border rounded-3 p-2">
                      <div className="form-check mb-1">
                        <input className="form-check-input" type="checkbox"
                          checked={catAllSelected}
                          ref={el => { if (el) el.indeterminate = catSomeSelected && !catAllSelected; }}
                          onChange={() => toggleCategory(cat.key, children)} />
                        <label className="form-check-label fw-semibold" style={{ fontSize: 13 }}>{cat.label}</label>
                      </div>
                      {children.map(child => (
                        <div key={child.key} className="form-check ms-3">
                          <input className="form-check-input" type="checkbox"
                            checked={selectedPerms.includes(child.key)}
                            onChange={() => togglePermission(child.key)} />
                          <label className="form-check-label" style={{ fontSize: 12 }}>{child.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="d-flex gap-2 mt-3 justify-content-end">
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowForm(false)}>
                {t('common.back', 'পিছনে')}
              </button>
              <button className="btn btn-primary btn-sm" onClick={saveRole} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                {t('common.save', 'সংরক্ষণ')}
              </button>
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>{t('common.close', 'বন্ধ')}</Button>
      </Modal.Footer>
    </Modal>
  );
}
