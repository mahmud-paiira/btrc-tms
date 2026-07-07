import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import hoService from '../../../services/hoService';
import { useTranslation } from '../../../hooks/useTranslation';
import UserForm from './UserForm';
import { convertToBanglaDigits } from '../../../utils/numberFormatter';
import UserDetail from './UserDetail';
import BulkUserImport from './BulkUserImport';
import RoleManagement from './RoleManagement';

const USER_TYPES = [
  { value: 'head_office', label: 'হেড অফিস' },
  { value: 'center_admin', label: 'কেন্দ্র প্রশাসক' },
  { value: 'trainer', label: 'প্রশিক্ষক' },
  { value: 'assessor', label: 'মূল্যায়নকারী' },
  { value: 'trainee', label: 'প্রশিক্ষণার্থী' },
];

export default function UserList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [filters, setFilters] = useState({ user_type: '', center: '', status: '', search: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  useEffect(() => {
    hoService.listCenters({ status: 'active', page_size: 50 }).then(res => {
      setCenters(res.data.results || res.data || []);
    }).catch(() => {});
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, page_size: pageSize };
      if (filters.user_type) params.user_type = filters.user_type;
      if (filters.center) params.center = filters.center;
      if (filters.status === 'active') params.is_active = true;
      else if (filters.status === 'suspended') params.is_active = false;
      if (filters.search) params.search = filters.search;
      const res = await hoService.listHOUsers(params);
      setUsers(res.data.results || res.data || []);
      setTotal(res.data.count || (res.data.results || []).length);
    } catch (err) {
      toast.error(t('users.loadError', 'ব্যবহারকারী লোড করতে ব্যর্থ'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, t]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    try {
      await hoService.toggleHOUser(user.id);
      toast.success(user.is_active ? t('users.suspended', 'নিষ্ক্রিয় করা হয়েছে') : t('users.activated', 'সক্রিয় করা হয়েছে'));
      fetchUsers();
    } catch {
      toast.error(t('users.toggleError', 'স্থিতি পরিবর্তন ব্যর্থ'));
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(t('users.confirmDelete', `${user.full_name_bn} কে মুছবেন?`))) return;
    try {
      await hoService.deleteHOUser(user.id);
      toast.success(t('users.deleted', 'মুছে ফেলা হয়েছে'));
      fetchUsers();
    } catch {
      toast.error(t('users.deleteError', 'মুছতে ব্যর্থ'));
    }
  };

  const handleResetPassword = async (user) => {
    try {
      const res = await hoService.resetPasswordHOUser(user.id);
      toast.success(`${t('users.passwordReset', 'পাসওয়ার্ড রিসেট করা হয়েছে')}: ${res.data.new_password}`);
    } catch {
      toast.error(t('users.passwordError', 'পাসওয়ার্ড রিসেট ব্যর্থ'));
    }
  };

  const goToPage = (p) => { if (p >= 1) setPage(p); };
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="px-4 py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="fw-bold mb-0"><i className="bi bi-people me-2 text-primary"></i>ব্যবহারকারী ব্যবস্থাপনা</h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-info btn-sm shadow-sm px-3" onClick={() => setShowImport(true)}>
            <i className="bi bi-upload me-1"></i>{t('users.import', 'ইম্পোর্ট')}
          </button>
          <button className="btn btn-outline-success btn-sm shadow-sm px-3" onClick={() => hoService.exportHOUsers().then(r => {
            const url = window.URL.createObjectURL(new Blob([r.data]));
            const a = document.createElement('a'); a.href = url;
            a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
          }).catch(() => toast.error(t('users.exportError', 'এক্সপোর্ট ব্যর্থ')))}>
            <i className="bi bi-download me-1"></i>{t('common.export', 'এক্সপোর্ট')}
          </button>
          <button className="btn btn-outline-warning btn-sm shadow-sm px-3" onClick={() => setShowRoles(true)}>
            <i className="bi bi-shield-lock me-1"></i>{t('users.roles', 'ভূমিকা')}
          </button>
          <button className="btn btn-primary btn-sm shadow-sm px-3" onClick={() => { setEditUser(null); setShowForm(true); }}>
            <i className="bi bi-plus-lg me-1"></i>{t('users.add', 'নতুন ব্যবহারকারী')}
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4 p-3 bg-white">
        <div className="row g-2">
          <div className="col-md-3">
            <label className="form-label small fw-bold">নাম/ইমেইল</label>
            <input className="form-control" placeholder={t('common.search', 'অনুসন্ধান...')}
              value={filters.search} onChange={e => { setFilters({ ...filters, search: e.target.value }); setPage(1); }} />
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold">ব্যবহারকারীর ধরণ</label>
            <select className="form-select" value={filters.user_type}
              onChange={e => { setFilters({ ...filters, user_type: e.target.value }); setPage(1); }}>
              <option value="">{t('common.allTypes', 'সব ধরণ')}</option>
              {USER_TYPES.map(ut => <option key={ut.value} value={ut.value}>{ut.label}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold">কেন্দ্র</label>
            <select className="form-select" value={filters.center}
              onChange={e => { setFilters({ ...filters, center: e.target.value }); setPage(1); }}>
              <option value="">{t('common.allCenters', 'সব কেন্দ্র')}</option>
              {centers.map(c => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-bold">অবস্থা</label>
            <select className="form-select" value={filters.status}
              onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
              <option value="">{t('common.allStatus', 'সব অবস্থা')}</option>
              <option value="active">{t('common.active', 'সক্রিয়')}</option>
              <option value="suspended">{t('common.suspended', 'নিষ্ক্রিয়')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0 table-card overflow-hidden">
        <div className="table-responsive">
          <table className="b-table w-100">
            <thead>
              <tr>
                <th className="ps-4"></th>
                <th>{t('users.name', 'নাম')}</th>
                <th>ইমেইল</th>
                <th>{t('users.type', 'ধরণ')}</th>
                <th>{t('budget.center', 'কেন্দ্র')}</th>
                <th>{t('users.phone', 'ফোন')}</th>
                <th>{t('common.status', 'অবস্থা')}</th>
                <th>{t('common.actions', 'অপশন')}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={9} className="text-center py-5"><div className="spinner-border text-primary" /></td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={9} className="text-center text-secondary py-5">{t('common.noData', 'কোন তথ্য নেই')}</td></tr>
              )}
              {!loading && users.map(u => (
                  <tr key={u.id}>
                    <td className="ps-4">
                      {u.profile_image_url ? (
                        <img src={u.profile_image_url} alt="" className="rounded-circle shadow-sm border"
                          style={{ width: 40, height: 40, objectFit: 'cover' }} />
                      ) : (
                        <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center border"
                          style={{ width: 40, height: 40 }}>
                          <i className="bi bi-person text-primary"></i>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold text-heading">{u.full_name_bn}</div>
                      <small className="text-muted">{u.full_name_en}</small>
                    </td>
                    <td><span className="text-primary">{u.email}</span></td>
                    <td><span className="badge bg-info bg-opacity-10 text-info border border-info">{u.user_type_display}</span></td>
                    <td>{u.center_name || '-'}</td>
                    <td>{convertToBanglaDigits(u.phone)}</td>
                    <td>
                      <span><span className={`status-dot dot-${u.is_active ? 'success' : 'secondary'}`}></span>{u.is_active ? t('common.active', 'সক্রিয়') : t('common.inactive', 'নিষ্ক্রিয়')}</span>
                    </td>
                    <td className="act-col">
                      <div className="dropdown act-dropdown">
                        <button className="dropdown-toggle" data-bs-toggle="dropdown" type="button" data-bs-strategy="fixed">
                          <i className="bi bi-three-dots-vertical"></i>
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          <li><button className="dropdown-item text-primary" onClick={() => navigate(`/ho/users/${u.id}`)}><i className="bi bi-eye me-2"></i>{t('common.view', 'দেখুন')}</button></li>
                          <li><hr className="dropdown-divider my-1" /></li>
                          <li><button className="dropdown-item text-primary" onClick={() => { setEditUser(u); setShowForm(true); }}><i className="bi bi-pencil me-2"></i>{t('common.edit', 'সম্পাদনা')}</button></li>
                          <li><button className={`dropdown-item ${u.is_active ? 'text-warning' : 'text-success'}`} onClick={() => handleToggleStatus(u)}>
                            <i className={`bi ${u.is_active ? 'bi-pause-circle' : 'bi-play-circle'} me-2`}></i>{u.is_active ? t('common.suspend', 'নিষ্ক্রিয়') : t('common.activate', 'সক্রিয়')}
                          </button></li>
                          <li><button className="dropdown-item text-secondary" onClick={() => handleResetPassword(u)}><i className="bi bi-key me-2"></i>{t('users.resetPassword', 'পাসওয়ার্ড রিসেট')}</button></li>
                          <li><hr className="dropdown-divider my-1" /></li>
                          <li><button className="dropdown-item text-danger" onClick={() => handleDelete(u)}><i className="bi bi-trash me-2"></i>{t('common.delete', 'মুছুন')}</button></li>
                        </ul>
                      </div>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3 ps-4 pe-4 b-pagination">
            <small className="text-secondary page-info">{t('common.showing', 'দেখানো হচ্ছে')} {Math.min((page-1)*pageSize+1, total)}-{Math.min(page*pageSize, total)} {t('common.of', 'এর')} {total}</small>
            <nav>
              <button className="page-btn" disabled={page <= 1} onClick={() => goToPage(page-1)}>পূর্ববর্তী</button>
              <button className="page-btn" disabled={page >= totalPages} onClick={() => goToPage(page+1)}>পরবর্তী</button>
            </nav>
          </div>
        )}
      </div>

      <UserForm show={showForm} onClose={() => { setShowForm(false); setEditUser(null); }}
        onSaved={fetchUsers} user={editUser} centers={centers} />
      <BulkUserImport show={showImport} onClose={() => setShowImport(false)} onImported={fetchUsers} />
      <RoleManagement show={showRoles} onClose={() => setShowRoles(false)} />
    </div>
  );
}

