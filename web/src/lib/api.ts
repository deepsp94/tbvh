import type {
  Instance,
  CreateInstanceInput,
  CommitInstanceInput,
  PublicInstanceView,
  MyInstancesResponse,
} from "@shared/types.js";

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

export async function listInstances(status?: string): Promise<PublicInstanceView[]> {
  const url = status ? `${BASE}/instances?status=${status}` : `${BASE}/instances`;
  const res = await fetch(url);
  return handleResponse<PublicInstanceView[]>(res);
}

export async function getInstance(id: string): Promise<PublicInstanceView> {
  const res = await fetch(`${BASE}/instances/${id}`);
  return handleResponse<PublicInstanceView>(res);
}

export async function createInstance(input: CreateInstanceInput): Promise<Instance> {
  const res = await fetch(`${BASE}/instances`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<Instance>(res);
}

export async function commitInstance(
  id: string,
  input: CommitInstanceInput
): Promise<PublicInstanceView> {
  const res = await fetch(`${BASE}/instances/${id}/commit`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<PublicInstanceView>(res);
}

export async function cancelInstance(id: string): Promise<void> {
  const res = await fetch(`${BASE}/instances/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
}

export async function getMyInstances(): Promise<MyInstancesResponse> {
  const res = await fetch(`${BASE}/instances/mine`, {
    headers: authHeaders(),
  });
  return handleResponse<MyInstancesResponse>(res);
}

export async function runNegotiation(id: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/instances/${id}/run`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<{ message: string }>(res);
}
