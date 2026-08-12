import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";

@Injectable()
export class CustomerServicesService {
    constructor(
        @Inject("CATALOG_SERVICE")
        private readonly catalogClient: ClientProxy,
    ) {}
}
