// src/store/index.ts
// ─── Store com backend Supabase ───────────────────────────────────────────────
// Mantém a mesma API pública das páginas existentes.
// localStorage foi completamente substituído por Supabase.

import { supabaseLogin, supabaseLogout, getUserProfile, getCurrentUid } from "../db/auth";
import {
  viaturasDB, motoristasDB, proprietariosDB,
  servicosDB, transacoesDB, usuariosClientesDB,
  rotasDB, usersDB,
} from "../db/database";
import type {
  AppUser, Viatura, Motorista, Rota, Servico,
  Proprietario, Transacao, UsuarioCliente,
} from "../types";

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface LoginResult { ok: boolean; user?: AppUser; error?: string; }

export async function authLogin(email: string, password: string): Promise<LoginResult> {
  return supabaseLogin(email, password);
}

export async function authLogout(): Promise<void> {
  return supabaseLogout();
}

export function authCurrentUser(): AppUser | null {
  // Síncrono — devolve dados básicos da sessão local gerida em `src/db/auth`
  const uid = getCurrentUid();
  if (!uid) return null;
  return { id: uid, uid, email: "", role: "superadmin" };
}

// ─── Validação de placa angolana (inalterado) ─────────────────────────────────
export function validarPlacaAngolana(placa: string): { valido: boolean; formatado: string } {
  placa = placa.trim().toUpperCase();
  const antigo       = /^[A-Z]{3}-\d{4}$/;
  const novo         = /^[A-Z]{2}-\d{2}-\d{2}-[A-Z]{2}$/;
  const novoSemHifen = /^[A-Z]{2}\d{4}[A-Z]{2}$/;
  if (antigo.test(placa))       return { valido: true, formatado: placa };
  if (novo.test(placa))         return { valido: true, formatado: placa };
  if (novoSemHifen.test(placa)) {
    const f = `${placa.slice(0,2)}-${placa.slice(2,4)}-${placa.slice(4,6)}-${placa.slice(6,8)}`;
    return { valido: true, formatado: f };
  }
  return { valido: false, formatado: placa };
}

// ─── veiculosStore ────────────────────────────────────────────────────────────
export const veiculosStore = {
  getAll:   viaturasDB.getAll,
  getById:  viaturasDB.getById,
  getByProprietario: viaturasDB.getByProprietario,
  add:      viaturasDB.insert,
  update:   viaturasDB.update,
  remove:   viaturasDB.remove,
  listenAll: viaturasDB.listenAll,
  listenByProprietario: viaturasDB.listenByProprietario,
  exists: async (field: keyof Viatura, value: unknown, excludeId?: string): Promise<boolean> => {
    const all = await viaturasDB.getAll();
    const dbField = field === "placa" ? "placa" : field;
    return all.some((v: any) => v[dbField] === value && v.id !== excludeId);
  },
};

// ─── motoristasStore ─────────────────────────────────────────────────────────
export const motoristasStore = {
  getAll:  motoristasDB.getAll,
  getById: motoristasDB.getById,
  add:     motoristasDB.insert,
  update:  motoristasDB.update,
  remove:  motoristasDB.remove,
  exists: async (field: keyof Motorista, value: unknown, excludeId?: string): Promise<boolean> => {
    const all = await motoristasDB.getAll();
    return all.some((m: any) => m[field] === value && m.id !== excludeId);
  },
};

// ─── proprietariosStore ──────────────────────────────────────────────────────
export const proprietariosStore = {
  getAll:  proprietariosDB.getAll,
  getById: proprietariosDB.getById,
  add:     proprietariosDB.insert,
  set:     proprietariosDB.upsert,
  update:  proprietariosDB.update,
  remove:  proprietariosDB.remove,
  exists: async (field: keyof Proprietario, value: unknown, excludeId?: string): Promise<boolean> => {
    const all = await proprietariosDB.getAll();
    return all.some((p: any) => p[field] === value && p.id !== excludeId);
  },
};

// ─── servicosStore ───────────────────────────────────────────────────────────
export const servicosStore = {
  getAll:            servicosDB.getAll,
  getById:           servicosDB.getById,
  getAtivos:         servicosDB.getAtivos,
  getFinalizados:    servicosDB.getFinalizados,
  getByViatura:      servicosDB.getByViatura,
  getByUsuario:      servicosDB.getByUsuario,
  getByProprietario: servicosDB.getByProprietario,
  add:               servicosDB.insert,
  update:            servicosDB.update,
  remove:            servicosDB.remove,
};

// ─── alugueresStore (alias legado para AlugueresPage.tsx) ────────────────────
export const alugueresStore = {
  getAll: async () => {
    const sv = await servicosDB.getAll();
    return sv.map((s: Servico & { id: string }) => ({
      ...s,
      // Normaliza campos camelCase esperados pela AlugueresPage
      veiculoId:       s.viatura_id,
      clienteNome:     s.cliente_nome ?? "",
      clienteContato:  s.cliente_contato ?? "",
      motoristaId:     s.motorista_id,
      rotaId:          s.rota_id,
      dataInicio:      s.data_inicio ?? "",
      dataFimPrevista: s.data_fim_prevista ?? "",
      dataFimReal:     s.data_fim_real,
      valorTotal:      s.valor_total ?? 0,
      status:
        s.status === "em_andamento" ? "ativo" :
        s.status === "finalizado"   ? "concluido" : "cancelado",
    })) as any[];
  },
  add: async (data: any) => {
    const valorTotal = data.valorTotal ?? data.valor_total ?? 0;
    return servicosDB.insert({
      tipo:               data.tipo ?? "aluguer",
      status:             "em_andamento",
      usuario_id:         data.usuarioId ?? data.usuario_id ?? "",
      viatura_id:         data.veiculoId ?? data.viatura_id ?? "",
      motorista_id:       data.motoristaId ?? data.motorista_id,
      proprietario_id:    data.proprietarioId ?? data.proprietario_id ?? "",
      rota_id:            data.rotaId ?? data.rota_id,
      cliente_nome:       data.clienteNome ?? data.cliente_nome ?? "",
      cliente_contato:    data.clienteContato ?? data.cliente_contato,
      data_inicio:        data.dataInicio ?? data.data_inicio ?? new Date().toISOString(),
      data_fim_prevista:  data.dataFimPrevista ?? data.data_fim_prevista,
      valor_total:        valorTotal,
      valor_proprietario: Math.round(valorTotal * 0.7 * 100) / 100,
      valor_sistema:      Math.round(valorTotal * 0.3 * 100) / 100,
      observacoes:        data.observacoes,
    } as any);
  },
  update: servicosDB.update,
  remove: servicosDB.remove,
  exists: async () => false,
};

// ─── transacoesStore ─────────────────────────────────────────────────────────
export const transacoesStore = {
  getAll:            transacoesDB.getAll,
  getByProprietario: transacoesDB.getByProprietario,
  getByViatura:      transacoesDB.getByViatura,
  add:               transacoesDB.insert,
  update:            transacoesDB.update,
};

// ─── utilizadoresStore ───────────────────────────────────────────────────────
export const utilizadoresStore = {
  getAll:   usersDB.getAll,
  getById:  usersDB.getById,
  update:   usersDB.update,
  remove:   usersDB.remove,
  add: async (data: any) => {
    await usersDB.upsert(data.id ?? data.uid, data);
    return data;
  },
  exists: async (field: string, value: unknown, excludeId?: string): Promise<boolean> => {
    const all = await usersDB.getAll();
    return all.some((u: any) => u[field] === value && u.id !== excludeId);
  },
};

// ─── rotasStore ──────────────────────────────────────────────────────────────
export const rotasStore = {
  getAll: async (): Promise<(Rota & { id: string })[]> => {
    const rows = await rotasDB.getAll();
    // Normaliza para camelCase esperado por RotasPage
    return rows.map((r: Rota & { id: string }) => ({
      ...r,
      nomeRota:      r.nome_rota ?? (r as any).nomeRota ?? "",
      tempoEstimado: r.tempo_estimado ?? (r as any).tempoEstimado ?? "",
    }));
  },
  getById: rotasDB.getById,
  add:     rotasDB.insert,
  update:  rotasDB.update,
  remove:  rotasDB.remove,
  exists: async (field: keyof Rota, value: unknown, excludeId?: string): Promise<boolean> => {
    const all = await rotasDB.getAll();
    return all.some((r: any) => r[field] === value && r.id !== excludeId);
  },
};

// ─── usuariosClientesStore ───────────────────────────────────────────────────
export const usuariosClientesStore = {
  getAll:  usuariosClientesDB.getAll,
  getById: usuariosClientesDB.getById,
  set:     usuariosClientesDB.upsert,
  update:  usuariosClientesDB.update,
  remove:  usuariosClientesDB.remove,
};
