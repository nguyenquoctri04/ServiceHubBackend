import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerSignaturesService {
    constructor(
        @Inject("SIGNATURE_SERVICE")
        private readonly signatureClient: ClientProxy,
    ) {}
}
