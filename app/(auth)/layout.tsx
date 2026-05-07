export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center p-4">
      {children}
    </main>
  );
}
