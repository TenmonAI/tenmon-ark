import type { Request, Response } from "express";

export function errorHandler(error: unknown, req: Request, res: Response) {
  console.error(`[ErrorHandler] ${req.method} ${req.path}:`, error);

  if (error instanceof Error && error.name === "ZodError") {
    return res.status(400).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: error.message },
    });
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  return res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message },
  });
}
