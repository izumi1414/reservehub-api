import bcrypt from "bcryptjs";
import { insertUser, findUserByEmail } from "../repositories/user.repository.js";
import { AppError } from "../errors/app.error.js";
import jwt from "jsonwebtoken";

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

export async function login(
  email: string,
  password: string
) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    throw new AppError(
      "ログインに失敗しました",
      401
    )
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new AppError(
      "ログインに失敗しました",
      401
    )
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign(
    {
      role: user.role
    },
    secret,
    {
      subject: user.id,
      expiresIn: "1h"
    }
  )

  return {
    accessToken: token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  }

}
