import AdminSidebar from '@/components/admin/AdminSidebar';

// Auth protection is handled entirely by src/proxy.ts.
// This layout ONLY wraps authenticated admin pages with the sidebar.
// The login page has its own layout (admin/login/layout.tsx) that overrides this.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0612' }}>
      <AdminSidebar />
      <main style={{ flex: 1, minWidth: 0, overflowX: 'hidden', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
