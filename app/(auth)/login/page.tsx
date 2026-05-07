import RoleCards from '@/components/auth/RoleCards';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center">
      <p className="font-serif text-3xl text-brown mb-2">Timbered</p>
      <p className="text-sm text-text-muted mb-10">Select your role to continue</p>
      <RoleCards />
    </div>
  );
}
