import type {
  Instance,
  CreateInstanceInput,
  PublicInstanceView,
  MyInstancesResponse,
  TeeInfo,
  TeeVerification,
  CommitNegotiationInput,
  BuyerNegotiationView,
  SellerNegotiationView,
  PublicNegotiationView,
} from "@shared/types.js";

import { API_BASE as BASE } from "./apiBase";

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

// Instance endpoints
export async function listInstances(status?: string): Promise<PublicInstanceView[]> {
  const url = status ? `${BASE}/instances?status=${status}` : `${BASE}/instances`;
  const res = await fetch(url);
  return handleResponse<PublicInstanceView[]>(res);
}

export async function getInstance(id: string): Promise<PublicInstanceView> {
  const res = await fetch(`${BASE}/instances/${id}`, {
    headers: authHeaders(),
  });
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

export async function closeInstance(id: string): Promise<PublicInstanceView> {
  const res = await fetch(`${BASE}/instances/${id}/close`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<PublicInstanceView>(res);
}

export async function deleteInstance(id: string): Promise<void> {
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

// Negotiation endpoints
export async function commitNegotiation(
  instanceId: string,
  input: CommitNegotiationInput
): Promise<SellerNegotiationView> {
  const res = await fetch(`${BASE}/instances/${instanceId}/negotiate`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return handleResponse<SellerNegotiationView>(res);
}

export async function listNegotiations(
  instanceId: string
): Promise<(BuyerNegotiationView | SellerNegotiationView | PublicNegotiationView)[]> {
  const res = await fetch(`${BASE}/instances/${instanceId}/negotiations`, {
    headers: authHeaders(),
  });
  return handleResponse<(BuyerNegotiationView | SellerNegotiationView | PublicNegotiationView)[]>(res);
}

export async function runNegotiation(nid: string): Promise<{ message: string }> {
  const res = await fetch(`${BASE}/negotiations/${nid}/run`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<{ message: string }>(res);
}

export async function acceptNegotiation(nid: string): Promise<BuyerNegotiationView> {
  const res = await fetch(`${BASE}/negotiations/${nid}/accept`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<BuyerNegotiationView>(res);
}

export async function cancelNegotiation(nid: string): Promise<BuyerNegotiationView> {
  const res = await fetch(`${BASE}/negotiations/${nid}/cancel`, {
    method: "POST",
    headers: authHeaders(),
  });
  return handleResponse<BuyerNegotiationView>(res);
}

// TEE endpoints
export async function getTeeInfo(): Promise<TeeInfo> {
  const res = await fetch(`${BASE}/tee/info`);
  return handleResponse<TeeInfo>(res);
}

export async function getTeeVerification(id: string): Promise<TeeVerification> {
  const res = await fetch(`${BASE}/tee/verify/${id}`);
  return handleResponse<TeeVerification>(res);
}
