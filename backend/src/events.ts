import type { Response } from "express";

interface SseClient {
  res: Response;
  userId: string;
}

const clientsByFamily = new Map<string, Set<SseClient>>();

export function addClient(familyId: string, client: SseClient) {
  let set = clientsByFamily.get(familyId);
  if (!set) {
    set = new Set();
    clientsByFamily.set(familyId, set);
  }
  set.add(client);

  const remove = () => {
    set.delete(client);
    if (set.size === 0) {
      clientsByFamily.delete(familyId);
    }
  };

  client.res.on("close", remove);
  return remove;
}

export function notifyFamily(familyId: string, type: string, byUserId: string) {
  const set = clientsByFamily.get(familyId);
  if (!set || set.size === 0) return;
  const payload = `data: ${JSON.stringify({ type, familyId, byUserId })}\n\n`;
  for (const client of set) {
    try {
      client.res.write(payload);
    } catch {
      // cliente desconectado, se limpiará en "close"
    }
  }
}

export function notifyUsers(familyId: string, userIds: string[], type: string, byUserId: string) {
  const set = clientsByFamily.get(familyId);
  if (!set || set.size === 0 || userIds.length === 0) return;
  const targets = new Set(userIds);
  const payload = `data: ${JSON.stringify({ type, familyId, byUserId })}\n\n`;
  for (const client of set) {
    if (!targets.has(client.userId)) continue;
    try {
      client.res.write(payload);
    } catch {
      // cliente desconectado, se limpiará en "close"
    }
  }
}
