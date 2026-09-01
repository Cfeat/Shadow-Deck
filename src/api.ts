const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

let token: string | null = localStorage.getItem("shadowdeck_token");

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem("shadowdeck_token", t);
  else localStorage.removeItem("shadowdeck_token");
}

export function getToken(): string | null {
  return token;
}

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

async function request<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

// ── Auth ──

export async function register(username: string, password: string) {
  const data = await request<{ token: string; user: { id: string; username: string } }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function login(username: string, password: string) {
  const data = await request<{ token: string; user: { id: string; username: string } }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(data.token);
  return data;
}

export async function verifyToken() {
  return request<{ user: { id: string; username: string } }>("/auth/me");
}

// ── Saves ──

export interface SaveSlotMeta {
  id: string;
  slot: number;
  floor: number;
  hp: number;
  gold: number;
  updatedAt: string;
}

export interface SaveSlotFull {
  id: string;
  slot: number;
  gameState: any;
  floor: number;
  hp: number;
  gold: number;
  updatedAt: string;
}

export async function listSaves() {
  return request<{ saves: SaveSlotMeta[] }>("/saves");
}

export async function getSave(slot: number) {
  return request<SaveSlotFull>(`/saves/${slot}`);
}

export async function putSave(slot: number, gameState: any, floor: number, hp: number, gold: number) {
  return request<{ success: boolean }>(`/saves/${slot}`, {
    method: "PUT",
    body: JSON.stringify({ gameState, floor, hp, gold }),
  });
}

export async function deleteSave(slot: number) {
  return request<{ success: boolean }>(`/saves/${slot}`, { method: "DELETE" });
}

// ── Leaderboard ──

export interface LeaderboardEntry {
  username: string;
  score: number;
  floor: number;
  victory: number;
  deck_size: number;
  relics_count: number;
  created_at: string;
}

export async function getLeaderboard() {
  return request<{ entries: LeaderboardEntry[] }>("/leaderboard");
}

export async function submitScore(score: number, floor: number, victory: boolean, deckSize: number, relicsCount: number) {
  return request<{ success: boolean }>("/leaderboard", {
    method: "POST",
    body: JSON.stringify({ score, floor, victory, deckSize, relicsCount }),
  });
}
