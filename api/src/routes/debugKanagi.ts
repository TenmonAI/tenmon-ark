import express from "express";

export const debugKanagiRouter = express.Router();

debugKanagiRouter.get("/", (req, res) => {
  res.json({
    status: "KANAGI DEBUG",
    message: "phase debug endpoint"
  });
});
