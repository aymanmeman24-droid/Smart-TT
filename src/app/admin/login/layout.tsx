// This layout intentionally overrides the parent admin layout for the login page.
// Without this file, AdminLayout would redirect unauthenticated users to /admin/login,
// then run again on /admin/login causing an infinite redirect loop.
export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
