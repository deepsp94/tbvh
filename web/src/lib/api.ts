import type { Instance, CreateInstanceInput } from "@shared/types.js";

const BASE = "/api";

function authHeaders(): Record<string, string> {
  const jwt = localStorage.getItem("tbvh_jwt");
  return {
    "Content-Type": "application/json",
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function listInstances(status?: string): Promise<Instance[]> {
  const url = status ? `${BASE}/instances?status=${status}` : `${BASE}/instances`;
  const res = await fetch(url);
  return handleResponse<Instance[]>(res);
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const res = await fetch(`${BASE}/instances`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<Instance>(res);
}
