export type Role = "user" | "assistant" | "system";

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  threadId: string;
  role: Role;
  text: string;
  createdAt: number;
}

export interface MemorySeed {
  id: string;
  threadId: string;
  summary: string;
  tags: string[];
  createdAt: number;
}
