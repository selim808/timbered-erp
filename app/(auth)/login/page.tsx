import RoleCards from '@/components/auth/RoleCards';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-baseline gap-2 mb-2">
        <p className="font-serif text-3xl text-brown">Timbered</p>
        <span className="text-xs font-bold text-gold-light bg-brown px-2 py-0.5 rounded-full tracking-widest">ERP</span>
      </div>
      <p className="text-sm text-text-muted mb-10">Select your role to continue</p>
      <RoleCards />
    </div>
  );
}
