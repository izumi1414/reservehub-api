import type { Request, Response } from "express";
import { registerUser } from "../services/auth.service.js";
import { AppError } from "../errors/app.error.js";

export async function postRegister(
  req: Request,
  res: Response
) {
  try {
    const body = req.body;

    if (!body || typeof body !== "object") {
      res.status(400).json({
        message: "リクエストボディが正しくありません"
      })
    }

    const { email, password } = body;

    if (!email || typeof email !== "string") {
      res.status(400).json({
        message: "emailを正しく指定してください"
      })
    }

    if (!password || typeof password !== "string") {
      res.status(400).json({
        message: "passwordを正しく指定してください"
      })
    }

    const user = await registerUser(email, password);

    res.status(201).json(user);
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
