import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Building2, Copy, Check, Upload, CheckCircle2, History, CreditCard } from 'lucide-react';

export default function MemberGivingPage() {
  const churchId = 'f243cfb0-7fab-4f6a-93c4-7b6492c1afd1';
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [activeTab, setActiveTab] = useState('give'); // 'give' | 'history'

  // Submission state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [fundType, setFundType] = useState('Tithe');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // History state
  const [givingHistory, setGivingHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchAccounts() {
      const { data } = await supabase
        .from('church_bank_accounts')
        .select('*')
        .eq('church_id', churchId)
        .eq('is_active', true);
      
      if (data && data.length > 0) {
        setBankAccounts(data);
        setSelectedAccount(data[0]);
      }
    }

    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || '');
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', user.id)
          .single();
        if (profile) {
          setFullName(profile.full_name || '');
          setPhone(profile.phone || '');
        }
      }
    }

    fetchAccounts();
    checkUser();
  }, [churchId]);

  const loadGivingHistory = async () => {
    setLoadingHistory(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    let query = supabase
      .from('giving')
      .select('id, amount, fund_type, status, created_at, receipt_url')
      .eq('church_id', churchId)
      .order('created_at', { ascending: false });

    if (user?.email) {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('email', user.email)
        .single();

      if (member) {
        query = query.eq('member_id', member.id);
      }
    }

    const { data } = await query;
    setGivingHistory(data || []);
    setLoadingHistory(false);
  };

  const copyToClipboard = (accNum, id) => {
    navigator.clipboard.writeText(accNum);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !fullName) {
      alert('Please fill in your name and amount transferred.');
      return;
    }

    try {
      setSubmitting(true);
      let uploadedReceiptUrl = null;

      if (receiptFile) {
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `receipts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('giving-receipts')
          .upload(filePath, receiptFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('giving-receipts')
          .getPublicUrl(filePath);

        uploadedReceiptUrl = publicUrl;
      }

      let matchedMemberId = null;
      if (email || phone) {
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .eq('church_id', churchId)
          .or(`email.eq.${email || ''},phone.eq.${phone || ''}`)
          .limit(1)
          .single();
        if (member) matchedMemberId = member.id;
      }

      const { error: insertError } = await supabase.from('giving').insert([
        {
          church_id: churchId,
          member_id: matchedMemberId,
          amount: parseFloat(amount),
          fund_type: fundType,
          bank_account_id: selectedAccount?.id,
          receipt_url: uploadedReceiptUrl,
          status: 'pending',
          notes: `Transfer by ${fullName} (${phone || 'No phone'})`
        }
      ]);

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting giving receipt:', err);
      alert('Error submitting receipt. Please check details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 text-slate-800 flex flex-col items-center">
      <div className="max-w-2xl w-full space-y-6">
        
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            founding pilot church
          </h1>
          <p className="text-xs text-slate-500 font-medium">Giving & Stewardship Portal</p>
        </div>

        <div className="flex bg-slate-200/70 p-1 rounded-2xl max-w-xs mx-auto">
          <button
            onClick={() => setActiveTab('give')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'give' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard size={14} /> Transfer & Give
          </button>
          <button
            onClick={() => {
              setActiveTab('history');
              loadGivingHistory();
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History size={14} /> My Giving History
          </button>
        </div>

        {activeTab === 'give' ? (
          submitted ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Transfer Record Received!</h2>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Thank you for your giving, <b>{fullName}</b>. Your transfer receipt has been recorded and will reflect in your history once verified by the finance team.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setAmount('');
                  setReceiptFile(null);
                }}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all"
              >
                Submit Another Transfer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 size={15} /> 1. Church Bank Account Details
                </h2>

                <div className="grid gap-3">
                  {bankAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedAccount?.id === acc.id
                          ? 'border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {acc.purpose || acc.label || 'Tithe & Offering'}
                          </span>
                          <p className="font-bold text-base text-slate-900 mt-1">{acc.bank_name}</p>
                          <p className="text-xs text-slate-500">{acc.account_name}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(acc.account_number, acc.id);
                          }}
                          className="flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl font-medium transition-all"
                        >
                          {copiedId === acc.id ? (
                            <>
                              <Check size={13} className="text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={13} /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <p className="font-mono text-xl font-bold text-indigo-700 tracking-wider mt-2">
                        {acc.account_number}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Upload size={15} /> 2. Notify Church & Upload Receipt
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Pastor John Adeyemi"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number (WhatsApp)</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08000000000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Fund / Purpose *</label>
                    <select
                      value={fundType}
                      onChange={(e) => setFundType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-600"
                    >
                      <option value="Tithe">Tithe</option>
                      <option value="Sunday Offering">Sunday Offering</option>
                      <option value="Building Project">Building Project</option>
                      <option value="Thanksgiving / Seed">Thanksgiving / Seed</option>
                      <option value="Welfare">Welfare</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Amount Transferred (₦) *</label>
                    <input
                      type="number"
                      required
                      min="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 10000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Upload Bank Transfer Receipt (Screenshot)</label>
                  <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      id="receipt-file"
                      className="hidden"
                      onChange={(e) => setReceiptFile(e.target.files[0])}
                    />
                    <label htmlFor="receipt-file" className="cursor-pointer space-y-1 block">
                      <Upload size={20} className="mx-auto text-slate-400" />
                      <p className="text-xs font-medium text-slate-700">
                        {receiptFile ? receiptFile.name : 'Tap to select transfer receipt image'}
                      </p>
                      <p className="text-[10px] text-slate-400">PNG, JPG, or PDF screenshot</p>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Submitting Receipt…' : 'Submit Transfer Confirmation'}
                </button>
              </form>
            </div>
          )
        ) : (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History size={16} /> My Previous Giving Records
            </h2>

            {loadingHistory ? (
              <p className="text-xs text-slate-400 py-6 text-center">Loading your history…</p>
            ) : givingHistory.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <p className="text-xs text-slate-500">No giving records found under your account yet.</p>
                <p className="text-[11px] text-slate-400">Transfers submitted with your registered phone number or email will appear here once recorded.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {givingHistory.map((item) => (
                  <div key={item.id} className="py-3 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{item.fund_type}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">₦{Number(item.amount).toLocaleString()}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status === 'verified' ? 'Verified' : 'Pending Verification'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}