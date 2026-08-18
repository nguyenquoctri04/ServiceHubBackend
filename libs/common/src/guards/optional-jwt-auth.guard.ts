import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Giống JwtAuthGuard nhưng KHÔNG throw khi thiếu/token sai — cho phép
 * khách vãng lai (chưa đăng nhập) vẫn truy cập được, chỉ khi có token
 * hợp lệ mới gắn req.user để cá nhân hoá kết quả.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard("jwt") {
    canActivate(context: ExecutionContext) {
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any) {
        return user || null;
    }
}
