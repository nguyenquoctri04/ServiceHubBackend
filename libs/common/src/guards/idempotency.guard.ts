import { CanActivate, ExecutionContext, Injectable, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class IdempotencyGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const idempotencyKey = request.headers['idempotency-key'];

    if (!idempotencyKey) {
      throw new BadRequestException('Missing Idempotency-Key header');
    }

    return true;
  }
}
