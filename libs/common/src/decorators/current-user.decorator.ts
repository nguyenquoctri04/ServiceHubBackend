import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    let user: any = null;

    if (ctx.getType() === 'http') {
      const request = ctx.switchToHttp().getRequest();
      user = request.user;
    } else if (ctx.getType() === 'rpc') {
      const rpcData = ctx.switchToRpc().getData();
      user = rpcData?.currentUser || rpcData?.user;
    }

    return data && user ? user[data] : user;
  },
);

