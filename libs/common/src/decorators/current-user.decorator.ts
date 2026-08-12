import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedUser } from "../types/authenticated-user.type";

export const CurrentUser = createParamDecorator(
  (
    data: string | undefined,
    ctx: ExecutionContext,
  ):
    AuthenticatedUser
    | AuthenticatedUser[keyof AuthenticatedUser]
    | null => {
    let user: AuthenticatedUser | null = null;

    if (ctx.getType() === "http") {
      const request = ctx.switchToHttp().getRequest();
      user = request.user as AuthenticatedUser;
    } else if (ctx.getType() === "rpc") {
      const rpcData = ctx.switchToRpc().getData();
      user = rpcData?.currentUser ?? rpcData?.user ?? null;
    }

    return data && user ? user[data] : user;
  },
);
