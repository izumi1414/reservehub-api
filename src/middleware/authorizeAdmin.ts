import type { Request, Response, NextFunction } from "express";

export function authorizeAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if(req.user?.role !== "admin") {
    res.status(403).json({
      message: "この操作を行う権限がありません"
    })
  }

  return next()
}
