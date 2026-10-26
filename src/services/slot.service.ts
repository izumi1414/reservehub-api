import { findSlotsByDate, findSlotById } from "../repositories/slot.repository.js";

export async function fetchSlotsByDate(startAt: string) {
  const endDate = new Date(startAt);
  endDate.setDate(endDate.getDate() + 7);
  const endAt = endDate.toISOString().slice(0,10);

  return findSlotsByDate(startAt, endAt)
}

export async function fetchSlotById(id: string) {
  return findSlotById(id);
}
