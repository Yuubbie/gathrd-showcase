import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ to = '/dashboard', label = 'Back to Dashboard' }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="flex items-center gap-2 text-sm text-ink/60 hover:text-ink font-medium mb-4 transition-colors"
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}
