import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import useStore from '../../store/useStore';

const SECTION_LABELS = {
  main: 'মূল',
  management: 'ব্যবস্থাপনা',
  portal: 'পোর্টাল',
  system: 'সিস্টেম',
};

export default function Sidebar({ links, brand, light }) {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarOpen = useStore(s => s.sidebarOpen);
  const setSidebarOpen = useStore(s => s.setSidebarOpen);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    const fn = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [setSidebarOpen]);

  useEffect(() => {
    const expanded = {};
    links.forEach(section => {
      section.items.forEach(item => {
        if (item.children) {
          const hasActive = item.children.some(child =>
            location.pathname === child.to || location.pathname.startsWith(child.to + '/')
          );
          if (hasActive) expanded[item.to] = true;
        }
      });
    });
    if (Object.keys(expanded).length > 0) {
      setExpandedMenus(prev => ({ ...prev, ...expanded }));
    }
  }, [links, location.pathname]);

  const toggleMenu = (to) => {
    setExpandedMenus(prev => ({ ...prev, [to]: !prev[to] }));
  };

  const collapsed = !sidebarOpen && !isMobile;

  return (
    <>
      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <div
        className={`sidebar${light ? ' sidebar-light' : ''}${collapsed ? ' collapsed' : ''}${isMobile && sidebarOpen ? ' mobile-open' : ''}`}
      >
        {/* Brand */}
        <div className="brand">
          <div className="brand-logo">
            <i className={brand?.icon || 'bi-truck'}></i>
          </div>
          <div className="brand-text">
            <div className="brand-title">{t(brand?.titleKey || 'site.titleShort', brand?.titleBn || 'BRTC TMS')}</div>
            <div className="brand-sub">{t(brand?.subKey || 'site.subtitle', brand?.subBn || 'প্রশিক্ষণ ব্যবস্থাপনা')}</div>
          </div>
          {isMobile && (
            <button className="btn-close ms-auto" onClick={() => setSidebarOpen(false)} />
          )}
        </div>

        {/* Navigation */}
        <div className="nav-wrap">
          {links.map((section, si) => (
            <div key={section.section || si}>
              {section.section && (
                <div className="nav-section-label">{t(section.section, SECTION_LABELS[section.section] || section.section)}</div>
              )}
              {section.items.map((item, ii) => (
                <div key={item.to || item.href || ii}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-nav-item"
                      onClick={() => { if (isMobile) setSidebarOpen(false); }}
                    >
                      <i className={`bi ${item.icon} nav-icon`}></i>
                      <span className="nav-label">{t(item.labelKey, item.labelBn)}</span>
                      <i className="bi bi-box-arrow-up-right ms-auto" style={{ fontSize: 10, opacity: 0.5 }}></i>
                    </a>
                  ) : (
                  <NavLink
                    to={item.to}
                    end={item.end !== false}
                    onClick={() => {
                      if (isMobile) setSidebarOpen(false);
                      if (item.children) toggleMenu(item.to);
                    }}
                    className={({ isActive }) =>
                      `sidebar-nav-item${isActive ? ' active' : ''}`
                    }
                  >
                    <i className={`bi ${item.icon} nav-icon`}></i>
                    <span className="nav-label">{t(item.labelKey, item.labelBn)}</span>
                    {item.badge != null && item.badge > 0 && (
                      <span className={`badge ${item.badgeColor || 'bg-danger'} rounded-pill nav-badge`}>{item.badge}</span>
                    )}
                    {item.children && (
                      <i className={`bi bi-chevron-down ms-auto${expandedMenus[item.to] ? ' rotate' : ''}`} style={{ fontSize: 10, opacity: 0.6 }}></i>
                    )}
                  </NavLink>
                  )}
                  {item.children && (
                    <div className="sidebar-sub" style={{ display: expandedMenus[item.to] ? '' : 'none' }}>
                      {item.children.map(child => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          onClick={() => { if (isMobile) setSidebarOpen(false); }}
                          className={({ isActive }) =>
                            `sidebar-sub-item${isActive ? ' active' : ''}`
                          }
                        >
                          <i className="bi bi-dot" style={{ fontSize: 14 }}></i>
                          <span>{t(child.labelKey, child.labelBn)}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer toggle */}
        <div className="sidebar-footer">
          {!isMobile && (
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}
              title={collapsed ? 'বিস্তারিত' : 'সংকুচিত'}>
              <i className={`bi bi-chevron-${collapsed ? 'right' : 'left'}`}></i>
            </button>
          )}
        </div>
      </div>
    </>
  );
}
