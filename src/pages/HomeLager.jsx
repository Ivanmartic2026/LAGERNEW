import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import RoleDashboard from '@/components/dashboard/RoleDashboard';

export default function HomeLager() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Primary CTA - Scan button */}
      <div className="p-4 pb-2">
        <Button
          onClick={() => navigate('/Scan')}
          className="w-full h-16 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-lg font-semibold shadow-lg shadow-blue-500/30 gap-3"
        >
          <Camera className="w-6 h-6" />
          Scanna etikett
        </Button>
      </div>

      {/* Dashboard */}
      <RoleDashboard />
    </div>
  );
}
