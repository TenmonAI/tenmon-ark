import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    // TENMON ID 固定チェック（オプション: 必要に応じて実装）
    // if (ctx.user.openId !== "TENMON_OPENID") {
    //   throw new TRPCError({ code: "FORBIDDEN", message: "TENMON専用機能です" });
    // }

    // IP制限（VPSのみ、オプション: 必要に応じて実装）
    // const allowedIPs = ["VPS_IP"];
    // const clientIP = ctx.req.ip || ctx.req.headers["x-forwarded-for"];
    // if (!allowedIPs.includes(clientIP)) {
    //   throw new TRPCError({ code: "FORBIDDEN", message: "許可されていないIPアドレスです" });
    // }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
