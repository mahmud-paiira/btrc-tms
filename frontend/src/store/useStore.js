import { create } from 'zustand';

const useStore = create((set, get) => ({
  // ── Sidebar ──────────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  // ── Notifications ────────────────────────────────────────────────────
  notifications: [],
  unreadCount: 0,
  setNotifications: (list) => set({
    notifications: list,
    unreadCount: list.filter(n => !n.read).length,
  }),
  addNotification: (n) => set(s => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  markRead: (id) => set(s => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
  markAllRead: () => set(s => ({
    notifications: s.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  // ── Approvals counter ────────────────────────────────────────────────
  pendingApprovals: 0,
  setPendingApprovals: (n) => set({ pendingApprovals: n }),

  // ── Selected center context ──────────────────────────────────────────
  selectedCenter: null,
  setSelectedCenter: (c) => set({ selectedCenter: c }),
}));

export default useStore;
