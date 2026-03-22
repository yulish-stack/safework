import { supabase } from './supabase';

export async function fetchAll() {
  const [pb, ps, ab, as_] = await Promise.all([
    supabase.from('businesses').select('*').eq('is_approved', false).order('created_at'),
    supabase.from('shelters').select('*').eq('is_approved', false).order('created_at'),
    supabase.from('businesses').select('*').eq('is_approved', true).order('name'),
    supabase.from('shelters').select('*').eq('is_approved', true).order('name'),
  ]);
  return {
    pendingBusinesses:  pb.data  ?? [],
    pendingShelters:    ps.data  ?? [],
    approvedBusinesses: ab.data  ?? [],
    approvedShelters:   as_.data ?? [],
  };
}

export async function approve(table, id) {
  const { error } = await supabase.from(table).update({ is_approved: true }).eq('id', id);
  if (error) throw error;
}

export async function remove(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function update(table, id, data) {
  const { error } = await supabase.from(table).update(data).eq('id', id);
  if (error) throw error;
}
