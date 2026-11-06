import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function ClaimAccount() {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/join/${slug}`, { replace: true });
  }, [navigate, slug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment">
      <p className="text-ink/50">Opening your church join link…</p>
    </div>
  );
}
