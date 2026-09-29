// src/lib/branchInviteFlow.ts
// Complete branch invitation flow using Supabase REST API directly
// No edge functions needed - uses Supabase REST API directly

import { supabase } from './supabaseClient';
import { useAuth } from '../context/AuthContext';

export interface BranchInvitation {
  id: string;
  email: string;
  token: string;
  parent_church_id: string;
  invited_by: string;
  hierarchy_level: 'district' | 'zone' | 'branch';
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
}

export interface CreateInvitationParams {
  email: string;
  hierarchyLevel: 'district' | 'zone' | 'branch';
}

export interface CreateBranchFromInvitationParams {
  token: string;
}

export async function createBranchInvitation(
  params: CreateInvitationParams,
  churchId: string,
  userRole: string
): Promise<{ success: boolean; invitation?: any; error?: string }> {
  if (!params.email.includes('@')) return { success: false, error: 'Invalid email' };
  if (!['senior_pastor', 'assistant_pastor', 'church_admin'].includes(userRole)) {
    return { success: false, error: 'Not authorized' };
  }

  try {
    // Get parent church info
    const { data: church, error: churchError } = await supabase
      .from('churches')
      .select('id, name, hierarchy_level, terminology')
      .eq('id', churchId)
      .single();

    if (churchError || !church) {
      return { success: false, error: 'Church not found' };
    }

    if (!['district', 'zone'].includes(church.hierarchy_level)) {
      return { success: false, error: 'Only district/zone can create branches' };
    }

    const token = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('branch_invitations')
      .insert({
        email: params.email.toLowerCase(),
        token: crypto.randomUUID().replace(/-/g, ''),
        parent_church_id: churchId,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
        hierarchy_level: params.hierarchyLevel,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (inviteError) {
      return { success: false, error: inviteError.message };
    }

    return { success: true, invitation };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBranchFromInvitation(
  params: CreateBranchFromInvitationParams
): Promise<{ success: boolean; branch?: any; error?: string }> {
  if (!params.token) return { success: false, error: 'Token required' };

  try {
    // Get invitation
    const { data: invitation, error: invError } = await supabase
      .from('branch_invitations')
      .select('*')
      .eq('token', params.token)
      .single();

    if (invError || !invitation) {
      return { success: false, error: 'Invalid or expired invitation token' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation already used or expired' };
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from('branch_invitations')
        .update({ status: 'expired' })
        .eq('token', params.token);
      return { success: false, error: 'Invitation has expired' };
    }

    // Get parent church info
    const { data: parentChurch } = await supabase
      .from('churches')
      .select('id, name, hierarchy_level, terminology')
      .eq('id', invitation.parent_church_id)
      .single();

    // Create branch
    const branchName = `Branch - ${invitation.email.split('@')[0]}`;
    const { data: newBranch, error: createError } = await supabase
      .from('churches')
      .insert({
        name: `Branch - ${invitation.email.split('@')[0]}`,
        parent_church_id: invitation.parent_church_id,
        hierarchy_level: 'branch',
        plan: 'regular',
        subscription_status: 'trialing',
        terminology: parentChurch?.hierarchy_level === 'zone' ? 'Zone' : 'District',
        max_members: 200,
      })
      .select()
      .single();

    if (createError) {
      return { success: false, error: createError.message };
    }

    // Update invitation status
    await supabase
      .from('branch_invitations')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString(),
        accepted_by: (await supabase.auth.getUser()).data.user?.id 
      })
      .eq('token', params.token);

    // Log event
    await supabase.from('billing_events').insert({
      church_id: invitation.parent_church_id,
      event_type: 'branch_created',
      description: `Branch created: ${newBranch?.name}`,
      metadata: { branch_id: newBranch?.id, email: invitation.email },
    });

    return { success: true, branch: newBranch };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getBranchInvitations(churchId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('branch_invitations')
    .select('*')
    .eq('parent_church_id', churchId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('branch_invitations')
    .update({ status: 'revoked' })
    .eq('id', invitationId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resendInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  const { data: invitation } = await supabase
    .from('branch_invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (!invitation) return { success: false, error: 'Invitation not found' };

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const { error } = await supabase
    .from('branch_invitations')
    .update({ 
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending'
    })
    .eq('id', invitationId);

  if (error) return { success: false, error: error.message };

  // TODO: Send email notification here
  return { success: true };
}