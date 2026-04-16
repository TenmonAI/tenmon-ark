import type { Request, Response } from "express";
import { ZodError } from "zod";

export function errorHandler(error: unknown, _req: Request, res: Response) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: "validation_error",
      details: error.issues,
    });
  }

  const message = error instanceof Error ? error.message : "internal_error";
  return res.status(500).json({
    success: false,
    error: message,
  });
}

