import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    if (ctx.getType() === 'http') {
      const request = ctx.switchToHttp().getRequest();
      return request.user;
    }
    // For RPC, we would extract from context
    if (ctx.getType() === 'rpc') {
      const data = ctx.switchToRpc().getData();
      return data?.user;
    }
    return null;
  },
);
