import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Eye, EyeOff, Mail, Lock, User, Church, AlertCircle } from 'lucide-react';

export default function BranchSignup() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<'verify' | 'signup' | 'onboard' | 'complete'>('verify');
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    churchName: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (token) {
      verifyToken();
    } else {
      navigate('/login');
    }
  }, [token, navigate]);

  async function verifyToken() {
    try {
      const { data, error } = await supabase
        .from('branch_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (error || !tokenData) {
        throw new Error('Invalid or expired invitation token');
      }

      if (invitation.status !== 'pending') {
        throw new Error(invitation.status === 'accepted' 
          ? 'This invitation has already been accepted' 
          : 'This invitation has expired or been revoked');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('This invitation has expired');
      }

      setInvitation(tokenData);
      setStep('signup');
      
      // Pre-fill email from invitation
      setFormData(prev => ({ ...prev, email: invitation.email }));
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => navigate('/login'), 3000);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }
      if (formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Create auth user
      const signUpResult = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            church_name: formData.churchName,
            role: 'senior_pastor',
          },
        },
      });

      const { data: authData, error: authError } = signUpResult;

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Update invitation status
      await supabase
        .from('branch_invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          accepted_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('token', token);

      // Create branch profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          role: 'senior_pastor',
          church_id: branchId, // This will be set after branch creation
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Create branch church record
      const branchName = formData.churchName || `Branch - ${formData.email.split('@')[0]}`;
      const { data: newBranch, error: branchError } = await supabase
        .from('churches')
        .insert({
          name: formData.churchName || `Branch - ${formData.email.split('@')[0]}`,
          parent_church_id: invitation.parent_church_id,
          hierarchy_level: 'branch',
          plan: 'regular',
          subscription_status: 'trialing',
          terminology: 'District',
          max_members: 200,
        })
        .select()
        .single();

      if (branchError) throw branchError;

      // Update profile with branch church_id
      await supabase
        .from('profiles')
        .update({ church_id: branch.id })
        .eq('id', authData.user.id);

      // Update invitation status
      await supabase
        .from('branch_invitations')
        .update({ 
          status: 'accepted', 
          accepted_at: new Date().toISOString(),
          accepted_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('token', token);

      setStep('onboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // TODO: Handle onboarding steps (add staff, members, giving setup, etc.)
      setStep('complete');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-signal border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-ink/5 p-8 text-center">
          <AlertCircle size={48} className="mx-auto text-rose mb-4" />
          <h2 className="font-display text-xl font-bold text-ink mb-2">Invalid Invitation</h2>
          <p className="text-ink/60 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="text-signal hover:text-signal-deep font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const inputStyle = "w-full border border-ink/10 rounded-lg px-4 py-3 text-base focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors";

  if (step === 'signup') {
    return (
      <div className="min-h-screen flex bg-parchment">
        {/* Left side - Branding */}
        <div className="hidden md:flex md:w-[42%] bg-signal-gradient relative overflow-hidden flex-col justify-between p-10">
          <div className="relative flex items-center gap-2">
            <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
            <span className="font-display font-bold text-white text-xl">Gathrd</span>
          </div>
          <div className="relative">
            <h1 className="font-display text-3xl font-bold text-white leading-tight mb-3">
              Set Up Your Branch
            </h1>
            <p className="text-white/70 text-sm">
              Complete your branch setup and start managing your church.
            </p>
          </div>
        </div>

        {/* Right side - Signup Form */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <form onSubmit={handleSignup} className="w-full max-w-sm space-y-5">
            <div className="md:hidden flex items-center gap-2 justify-center mb-6">
              <img src="/logo-mark.png" alt="Gathrd" className="h-10 w-10" />
              <span className="font-display font-bold text-ink text-xl">Gathrd</span>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold text-ink">Create Your Account</h2>
              <p className="text-ink/50 text-sm mt-1">Set up your branch pastor account</p>
            </div>

            {error && (
              <div className="text-sm text-rose bg-rose-50 rounded-lg p-3">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className={inputStyle}
                placeholder="Pastor John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Branch Church Name</label>
              <input
                type="text"
                value={formData.churchName}
                onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                className={inputStyle}
                placeholder="Grace Community Branch"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputStyle}
                autoComplete="email"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputStyle}
                placeholder="+234 800 000 0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={inputStyle + ' pr-10'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/80 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={inputStyle + ' pr-10'}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/60"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-signal hover:bg-signal-deep text-white rounded-lg py-3 font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating Account…' : 'Create Account & Continue'}
            </button>

            <p className="text-sm text-center text-ink/50">
              By continuing, you agree to our <a href="#" className="text-signal hover:text-signal-deep">Terms of Service</a> and <a href="#" className="text-signal hover:text-signal-deep">Privacy Policy</a>
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'onboard') {
    return (
      <div className="min-h-screen bg-parchment px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-ink">Welcome to Your Branch!</h1>
            <p className="text-ink/50 mt-2">Let's set up your branch for success</p>
          </div>

          <div className="space-y-4">
            <OnboardingCard
              icon={Users}
              title="Add Staff & Leaders"
              description="Invite assistant pastors, admins, and department heads"
              actionText="Add Staff"
              onClick={() => navigate('/branches')} // Will navigate to branch staff page
            />
            <OnboardingCard
              icon={UserPlus}
              title="Add Members"
              description="Import or add congregation members to your branch"
              actionText="Add Members"
              onClick={() => navigate('/members')}
            />
            <OnboardingCard
              icon={Wallet}
              title="Set Up Giving"
              description="Configure tithes, offerings, and payment methods"
              actionText="Set Up Giving"
              onClick={() => navigate('/giving/settings')}
            />
            <OnboardingCard
              icon={Church}
              title="Customize Your Branch"
              description="Upload logo, set brand colors, and customize settings"
              actionText="Customize"
              onClick={() => navigate('/settings')}
            />
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-signal hover:bg-signal-deep text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function OnboardingCard({ icon: Icon, title, description, actionText, onClick }: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
  actionText: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-ink/5 p-6 hover:border-signal/30 hover:bg-signal/5 transition-all text-left"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-signal/10 flex items-center justify-center shrink-0">
          <Icon size={24} className="text-signal" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-bold text-ink">{title}</h3>
          <p className="text-ink/50 text-sm mt-1">{description}</p>
          <span className="inline-flex items-center gap-1 text-sm text-signal font-semibold mt-2">
            {actionText} <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

