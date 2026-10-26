import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // Safe logging without leaking sensitive database credentials or secrets
  console.error(`[API Error] ${req.method} ${req.path}:`, err.message || err);

  const statusCode = typeof err.statusCode === "number" ? err.statusCode : 500;
  const message = err.message || "An internal server error occurred.";

  res.status(statusCode).json({
    success: false,
    message,
  });
}
