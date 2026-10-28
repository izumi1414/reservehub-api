import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = process.env.JWT_SECRET;

  if(!secret) {
    console.error("JWT_SECRET is not configured");
    return res.status(500).json({
      message: "Internal Server Error"
    })
  }

  const authHeader = req.headers.authorization;

  if(!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "認証が必要です"
    })
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"]
    })

    if(
      typeof decoded === "string" ||
      !decoded.sub ||
      (decoded.role !== "user" && decoded.role !== "admin")
    ) {
      return res.status(401).json({
        message: "認証に失敗しました"
      })
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role
    }

    return next();
  } catch(error) {
    return res.status(401).json({
      message: "認証に失敗しました"
    })
  }
}
