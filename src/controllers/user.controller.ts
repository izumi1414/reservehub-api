import { Request, Response } from "express";
import { getUserbyId, updateUserEmail, changePassword, deleteUser } from "../services/user.service.js";
import { AppError } from "../errors/app.error.js";

export async function getMyProfile(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "認証が必要です"
      })
    }

    const user = await getUserbyId(userId);

    return res.status(200).json(user);
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

export async function patchMyProfile(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "認証が必要です"
      })
    }

    const body = req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        message: "リクエストボディが正しくありません"
      })
    }

    const { email } = body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        message: "emailを正しく指定してください"
      })
    }

    const updatedUser = await updateUserEmail(userId, email);

    return res.status(200).json(updatedUser);
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

export async function patchPassword(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "認証が必要です"
      });
    }

    const body = req.body;

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return res.status(400).json({
        message: "リクエストボディが正しくありません"
      });
    }

    const { currentPassword, newPassword } = body;

    if (
      typeof currentPassword !== "string" ||
      !currentPassword
    ) {
      return res.status(400).json({
        message: "currentPasswordを正しく指定してください"
      });
    }

    if (
      typeof newPassword !== "string" ||
      !newPassword
    ) {
      return res.status(400).json({
        message: "newPasswordを正しく指定してください"
      });
    }

    await changePassword(
      userId,
      currentPassword,
      newPassword
    );

    return res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
}

export async function deleteMyAccount(
  req: Request,
  res: Response
) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "認証が必要です"
      });
    }

    await deleteUser(userId);

    return res.status(204).send();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    console.error(error);

    return res.status(500).json({
      message: "Internal Server Error"
    });
  }
}
