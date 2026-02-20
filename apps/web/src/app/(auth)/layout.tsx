export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* Background effects */}
      <div className="bg-pattern" />
      <div className="bg-grid" />
      {children}
    </div>
  );
}
