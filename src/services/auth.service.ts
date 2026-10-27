import bcrypt from "bcryptjs";
import { insertUser, findUserByEmail } from "../repositories/user.repository.js";
import { AppError } from "../errors/app.error.js";

export async function registerUser(
  email: string,
  password: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new AppError(
      "メールアドレスの形式が正しくありません",
      400
    );
  }

  if (password.length < 8) {
    throw new AppError(
      "パスワードは8文字以上にしてください",
      400
    );
  }

  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new AppError(
      "パスワードが長すぎます",
      400
    );
  }

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new AppError(
      "このメールアドレスはすでに登録されています",
      409
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await insertUser(
    normalizedEmail,
    passwordHash
  );

  return {
    id: user.id,
    email: normalizedEmail,
  };
}
