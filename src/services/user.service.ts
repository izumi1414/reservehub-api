import { findUserById, findUserByEmail, updateUser, updatePasswordHash, softDeleteUser } from "../repositories/user.repository.js"
import { AppError } from "../errors/app.error.js";
import bcrypt from "bcryptjs";

export async function getUserbyId(id: string) {
  const user = await findUserById(id);

  if (!user) {
    throw new AppError("ユーザーが見つかりません", 404)
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.created_at
  }
}

export async function updateUserEmail(id: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AppError(
      "メールアドレスの形式が正しくありません",
      400
    );
  }

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser && existingUser.id !== id) {
    throw new AppError(
      "このメールアドレスはすでに登録されています",
      409
    );
  }

  const updatedUser = await updateUser(id, normalizedEmail);

  if (!updatedUser) {
    throw new AppError("ユーザーが見つかりません", 404);
  }

  return updatedUser;
}

export async function changePassword(
  id: string,
  currentPassword: string,
  newPassword: string
) {
  if (newPassword.length < 8) {
    throw new AppError(
      "パスワードは8文字以上にしてください",
      400
    );
  }

  if (Buffer.byteLength(newPassword, "utf8") > 72) {
    throw new AppError(
      "パスワードが長すぎます",
      400
    );
  }

  const user = await findUserById(id);

  if (!user) {
    throw new AppError("ユーザーが見つかりません", 404);
  }

  const isPasswordValid = await bcrypt.compare(
    currentPassword,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new AppError(
      "現在のパスワードが正しくありません",
      401
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const updatedUser = await updatePasswordHash(
    id,
    passwordHash
  );

  if (!updatedUser) {
    throw new AppError("ユーザーが見つかりません", 404);
  }
}

export async function deleteUser(id: string) {
  const user = await findUserById(id);

  if (!user) {
    throw new AppError("ユーザーが見つかりません", 404);
  }

  const deletedUser = await softDeleteUser(id);

  if(!deletedUser) {
    throw new AppError("ユーザーが見つかりません", 404)
  }

}
