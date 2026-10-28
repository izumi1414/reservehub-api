import type { Request, Response } from "express";
import { login, registerUser } from "../services/auth.service.js";
import { AppError } from "../errors/app.error.js";

export async function postRegister(
  req: Request,
  res: Response
) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        message: "リクエストボディが正しくありません"
      })
    }

    const { email, password } = body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "emailを正しく指定してください"
      })
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "passwordを正しく指定してください"
      })
    }

    const user = await registerUser(email, password);

    return res.status(201).json(user);
  } catch (error) {
    console.error(error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal Server error'
    })
  }

}

export async function postLogin(
  req: Request,
  res: Response
) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        message: "リクエストボディが正しくありません"
      })
    }

    const { email, password } = body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "emailを正しく指定してください"
      })
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        message: "passwordを正しく指定してください"
      })
    }

    const loginUser = await login(email, password);

    return res.status(200).json(loginUser)
  } catch (error) {
    console.error(error);

    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message,
      });
    }

    return res.status(500).json({
      message: 'Internal Server error'
    })
  }

}
