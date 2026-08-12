import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerEkycService {
    constructor(
        @Inject("IDENTITY_SERVICE")
        private readonly identityClient: ClientProxy,
    ) {}
}
