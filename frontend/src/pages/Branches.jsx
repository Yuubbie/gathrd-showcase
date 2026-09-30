import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import BackButton from '../components/BackButton';
import {
  Users, Wallet, ClipboardCheck, Plus, ChevronRight, Building2,
  TrendingUp, TrendingDown, Minus, Mail,
} from 'lucide-react';
import { createBranchInvitation, getBranchInvitations, revokeInvitation } from '../lib/branchInviteFlow';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function Branches() {
  const { profile, church } = useAuth();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteError, setInviteError] = useState('');

  const isDistrict = church?.hierarchy_level === 'district';
  const isZone = church?.hierarchy_level === 'zone';
  const canManageBranches = isDistrict || isZone;
  const terminology = church?.terminology || 'District';

  useEffect(() => {
    if (!canManageBranches) return;
    loadBranches();
  }, [canManageBranches]);

  async function loadBranches() {
    setLoading(true);
    try {
      const invitations = await getBranchInvitations(church?.id || '');
      setBranches(invitations);
    } catch (err) {
      console.error('Failed to load branches:', err);
    }
    setLoading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setInviteSuccess('');
    setInviteError('');

    try {
      const result = await createBranchInvitation(
        { email: inviteEmail, hierarchyLevel: church?.hierarchy_level || 'district' },
        church?.id || '',
        profile?.role || ''
      );

      if (!result.success) throw new Error(result.error);

      const signupUrl = `${window.location.origin}/branch-signup/${result.invitation.token}`;

      console.log('Sending invitation email...', { signupUrl });
      const emailSent = await sendInvitationEmail(inviteEmail.trim(), signupUrl);
      console.log('Email sent result:', emailSent);

      setInviting(false);
      if (emailSent) {
        setInviteSuccess('Invitation sent! Email sent to branch pastor.');
      } else {
        setInviteSuccess(
          `Invitation created, but the email could not be sent. Copy this link and share it with the branch pastor:\n\n${signupUrl}`
        );
      }
      setInviteEmail('');
      setShowInvite(false);
      loadBranches();
    } catch (err) {
      setInviting(false);
      setInviteError(err.message || 'Failed to create invitation. Please try again.');
    }
  }

  async function sendInvitationEmail(toEmail, signupUrl) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const inviterName = escapeHtml(profile?.full_name || 'Pastor');
      const parentChurchName = escapeHtml(church?.name || 'Your Church');
      const hierarchyLevel = escapeHtml(church?.hierarchy_level || 'District');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString();
      const year = new Date().getFullYear();

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #fbbf24; margin: 0; font-size: 28px; font-weight: 700;">You're Invited</h1>
            <p style="color: #d1d5db; margin-top: 8px; font-size: 16px;">To join ${parentChurchName} on Gathrd</p>
          </div>

          <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 16px;">Hello,</p>
            <p style="color: #4b5563; margin-bottom: 24px;">
              <strong>${inviterName}</strong> has invited you to set up a <strong>${hierarchyLevel}</strong> branch
              under <strong>${parentChurchName}</strong> on Gathrd.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${signupUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
                        color: #fbbf24; padding: 16px 32px; text-decoration: none;
                        border-radius: 8px; font-weight: 600; font-size: 16px;">
                Set Up Your Branch
              </a>
            </div>

            <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>This invitation expires on ${expiresAt}.</strong><br>
                Please complete your setup before then.
              </p>
            </div>

            <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              &copy; ${year} Gathrd. All rights reserved.<br>
              Church Management Platform for Nigerian Churches
            </p>
          </div>
        </body>
        </html>
      `;

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          to: toEmail,
          subject: `You're invited to join ${church?.name || 'a church'} on Gathrd`,
          html: emailHtml,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseErr) {
        console.warn('send-email returned a non-JSON response');
      }
      console.log('Email send result:', response.status, data);
      return response.ok && !(data && data.error);
    } catch (err) {
      console.error('Email send failed:', err);
      return false;
    }
  }

  async function getBranchStats(branchId) {
    const [{ count: memberCount }, { data: givingData }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', branchId).is('deleted_at', null),
      supabase.from('giving_records').select('amount').eq('church_id', branchId).eq('status', 'success'),
    ]);

    const totalGiving = givingData?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;

    return { members: memberCount || 0, giving: totalGiving };
  }

  if (!canManageBranches) {
    return (
      <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
        <div className="max-w-lg mx-auto text-center">
          <Building2 size={48} className="mx-auto text-ink/20 mb-4" />
          <h1 className="font-display text-2xl font-bold text-ink">Branch Management</h1>
          <p className="text-ink/50 mt-2">
            Upgrade to a {terminology} or Zone plan to manage multiple branches.
          </p>
          <Link to="/billing" className="inline-block mt-4 bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            Upgrade Plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-parchment px-4 py-6 md:px-10 md:py-8">
      <div className="max-w-4xl mx-auto space-y-4">
        <BackButton />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">My Branches</h1>
            <p className="text-ink/50 text-sm">{branches.length} branch{branches.length !== 1 ? 'es' : ''} under your {terminology}</p>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={18} /> Add Branch
          </button>
        </div>

        {/* Invite Form */}
        {showInvite && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow-lg p-5">
            <h2 className="font-display font-bold text-ink mb-3">Invite a New Branch</h2>
            <form onSubmit={handleInvite} className="space-y-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Branch pastor's email"
                className="w-full border border-ink/10 rounded-lg px-4 py-2.5 text-sm focus:border-signal focus:ring-1 focus:ring-signal outline-none"
              />
              {inviteError && <p className="text-sm text-rose">{inviteError}</p>}
              {inviteSuccess && <p className="text-sm text-sage">{inviteSuccess}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-signal hover:bg-signal-deep text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Creating…' : 'Create Branch'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowInvite(false); setInviteEmail(''); setInviteError(''); setInviteSuccess(''); }}
                  className="text-ink/50 hover:text-ink font-medium px-4 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Success / fallback message stays visible after the form closes */}
        {!showInvite && inviteSuccess && (
          <div className="bg-white rounded-2xl border border-ink/5 shadow p-4">
            <p className="text-sm text-sage whitespace-pre-line break-words">{inviteSuccess}</p>
          </div>
        )}

        {/* Branch List */}
        {loading ? (
          <div className="text-center text-ink/40 py-10">Loading branches…</div>
        ) : branches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-ink/5 p-10 text-center">
            <Building2 size={48} className="mx-auto text-ink/20 mb-3" />
            <p className="text-ink/50">No branches yet. Add your first branch to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {branches.map((branch) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                terminology={terminology}
                onRevoked={loadBranches}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BranchCard({ branch, terminology, onRevoked }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // For accepted invitations, branch might have id pointing to the actual church
    const branchId = branch.church_id || branch.id;
    async function loadStats() {
      const [{ count: memberCount }, { data: givingData }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', branchId).is('deleted_at', null),
        supabase.from('giving_records').select('amount').eq('church_id', branchId).eq('status', 'success'),
      ]);
      const totalGiving = givingData?.reduce((sum, g) => sum + (g.amount || 0), 0) || 0;
      setStats({ members: memberCount || 0, giving: totalGiving });
    }
    if (branch.status === 'accepted') {
      loadStats();
    }
  }, [branch]);

  async function handleRevoke() {
    try {
      await revokeInvitation(branch.id);
    } catch (err) {
      console.error('Failed to revoke invitation:', err);
    }
    if (onRevoked) onRevoked();
  }

  const planLabel = {
    regular: 'Regular',
    'multi-leader': 'Multi-Leader',
    district: 'District',
    zone: 'Zone',
  }[branch.plan] || branch.plan;

  const statusColor = {
    pending: 'bg-signal/10 text-signal',
    accepted: 'bg-sage/10 text-sage',
    expired: 'bg-rose/10 text-rose',
    revoked: 'bg-ink/10 text-ink',
  }[branch.status] || 'bg-ink/10 text-ink';

  return (
    <div className="bg-white rounded-2xl border border-ink/5 p-4 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-signal/10 flex items-center justify-center shrink-0">
        {branch.logo_url ? (
          <img src={branch.logo_url} alt={branch.name} className="w-10 h-10 object-contain rounded-lg" />
        ) : (
          <Building2 size={24} className="text-signal" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-ink truncate">{branch.name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${statusColor}`}>
            {branch.status}
          </span>
        </div>
        <p className="text-xs text-ink/50">
          {branch.hierarchy_level ? `${branch.hierarchy_level.charAt(0).toUpperCase() + branch.hierarchy_level.slice(1)} Branch` : 'Branch'}
          {branch.created_at && ` · Invited ${new Date(branch.created_at).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })}`}
        </p>
        {stats && (
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-ink/50 flex items-center gap-1">
              <Users size={12} /> {stats.members} members
            </span>
            <span className="text-xs text-ink/50 flex items-center gap-1">
              <Wallet size={12} /> ₦{(stats.giving / 100).toLocaleString()} given
            </span>
          </div>
        )}
      </div>
      {branch.status === 'pending' && (
        <button
          onClick={handleRevoke}
          className="text-xs text-rose hover:text-rose/80 font-medium"
        >
          Revoke
        </button>
      )}
      {branch.status === 'accepted' && (
        <ChevronRight size={20} className="text-ink/20 shrink-0" />
      )}
    </div>
  );
}