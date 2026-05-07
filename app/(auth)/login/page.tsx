import Image from 'next/image';
import RoleCards from '@/components/auth/RoleCards';

const LOGO = 'https://timberedgroup.com/wp-content/uploads/2024/04/Asset-14.png';

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center">
      <Image src={LOGO} alt="Timbered" width={48} height={48} className="object-contain mb-8" />
      <p className="text-lg font-bold text-brown mb-2">Timbered Dashboard</p>
      <p className="text-sm text-text-muted mb-10">Select your role to continue</p>
      <RoleCards />
    </div>
  );
}
