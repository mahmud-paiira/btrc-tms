import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import hoService from '../../services/hoService';

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useStore();

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  useEffect(() => {
    hoService.getRecentActivity(1).then(res => {
      const acts = res.data?.results || res.data || [];
      if (Array.isArray(acts)) {
        setNotifications(acts.slice(0, 10).map(a => ({
          id: a.id || Math.random(),
          message: a.description || a.action || '',
          time: a.created_at || new Date().toISOString(),
          read: false,
          link: a.target_type === 'Trainer' ? '/ho/trainers' :
                a.target_type === 'Assessor' ? '/ho/assessors' :
                a.target_type === 'Application' ? '/ho/approvals' : null,
        })));
      }
    }).catch(() => {});
  }, [setNotifications]);

  return (
    <div className="position-relative" ref={ref}>
      <button className="btn btn-sm btn-outline-secondary position-relative" onClick={() => setOpen(!open)}>
        <i className="bi bi-bell"></i>
        {unreadCount > 0 && (
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: 9 }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="position-absolute end-0 mt-2 shadow-lg bg-white rounded-3" style={{ width: 360, maxHeight: 420, zIndex: 1050, overflow: 'hidden' }}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <span className="fw-semibold" style={{ fontSize: 13 }}>নোটিফিকেশন</span>
            {unreadCount > 0 && (
              <button className="btn btn-sm btn-link p-0 text-decoration-none" style={{ fontSize: 11 }} onClick={markAllRead}>
                সব পড়া হয়েছে
              </button>
            )}
          </div>
          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <p className="text-secondary text-center py-4" style={{ fontSize: 13 }}>কোন নোটিফিকেশন নেই</p>
            ) : (
              notifications.map(n => (
                <div key={n.id}
                  className={`px-3 py-2 border-bottom ${!n.read ? 'bg-primary bg-opacity-10' : ''}`}
                  style={{ cursor: n.link ? 'pointer' : 'default' }}
                  onClick={() => {
                    markRead(n.id);
                    if (n.link) { navigate(n.link); setOpen(false); }
                  }}>
                  <div className="d-flex gap-2">
                    <div className={`rounded-circle flex-shrink-0 d-flex align-items-center justify-content-center ${!n.read ? 'bg-primary' : 'bg-secondary bg-opacity-25'}`}
                      style={{ width: 28, height: 28 }}>
                      <i className={`bi ${!n.read ? 'bi-envelope-fill text-white' : 'bi-envelope text-secondary'}`} style={{ fontSize: 11 }}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, lineHeight: 1.3 }}>{n.message}</div>
                      <small className="text-secondary" style={{ fontSize: 10 }}>
                        {new Date(n.time).toLocaleString('bn-BD')}
                      </small>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
