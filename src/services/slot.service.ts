import { findSlotsByDate, findSlotById, findAllSlots, insertSlot, updateAbailableSlot, deleteAvailableSlot } from "../repositories/slot.repository.js";
import { AppError } from "../errors/app.error.js";

export async function fetchSlotsByDate(startAt: string) {
  const endDate = new Date(startAt);
  endDate.setDate(endDate.getDate() + 7);
  const endAt = endDate.toISOString().slice(0, 10);

  return findSlotsByDate(startAt, endAt)
}

export async function fetchSlotById(id: string) {
  return findSlotById(id);
}

export async function fetchAllSlot() {
  return findAllSlots();
}

function validateSlotDates(
  startAt: string,
  endAt: string
) {
  if (
    isNaN(Date.parse(startAt)) ||
    isNaN(Date.parse(endAt))
  ) {
    return "startAt,endAtを正しい形式で入力してください";
  }
  if (new Date(startAt) >= new Date(endAt)) {
    return "endAtはstartAtより遅い日時を選択してください";
  }

  return undefined;
}

export async function registerSlot(
  startAt: string,
  endAt: string
) {
  const validationError = validateSlotDates(startAt, endAt);

  if (validationError) {
    throw new AppError(validationError, 400)
  }

  return insertSlot(startAt, endAt);
}

export async function editSlot(
  id: string,
  startAt: string,
  endAt: string,
  isAccepting: boolean
) {
  const validationError = validateSlotDates(startAt, endAt);

  if (validationError) {
    throw new AppError(validationError, 400)
  }

  const slot = await findSlotById(id);

  if (!slot) {
    throw new AppError(
      "予約枠が見つかりませんでした",
      404
    )
  }

  if (slot.status === "reserved") {
    const requestedStartAt = new Date(startAt).toISOString();
    const requestedEndAt = new Date(endAt).toISOString();
    const currentStartAt = new Date(slot.start_at).toISOString();
    const currentEndAt = new Date(slot.end_at).toISOString();

    if (
      requestedStartAt !== currentStartAt ||
      requestedEndAt !== currentEndAt
    ) {
      throw new AppError(
        "すでに予約されているため、予約枠の日時は編集できません",
        409
      )
    }
  }

  const updateSlot = await updateAbailableSlot(
    id,
    startAt,
    endAt,
    isAccepting
  )

  if(!updateSlot) {
    throw new AppError(
      "予約枠の編集ができませんでした",
      409
    )
  }

  return updateSlot;
}

export async function deleteSlotById(id: string) {
  const slot = await findSlotById(id);

  if (!slot) {
    throw new AppError(
      "予約枠が見つかりませんでした",
      404
    )
  }

  if (slot.status === "reserved") {
    throw new AppError(
      "すでに予約されているため、予約枠の編集はできません",
      409
    )
  }

  const deletedSlot = await deleteAvailableSlot(id);

  if(!deletedSlot) {
    throw new AppError(
      "予約枠の削除ができませんでした",
      409
    )
  }

  return deletedSlot;
}
