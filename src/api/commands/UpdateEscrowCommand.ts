import * as Bookshelf from 'bookshelf';
import { inject, named } from 'inversify';
import { validate, request } from '../../core/api/Validate';
import { Logger as LoggerType } from '../../core/Logger';
import { Types, Core, Targets } from '../../constants';
import { EscrowService } from '../services/EscrowService';
import { RpcRequest } from '../requests/RpcRequest';
import { Escrow } from '../models/Escrow';
import {RpcCommand} from './RpcCommand';

export class UpdateEscrowCommand implements RpcCommand<Escrow> {

    public log: LoggerType;
    public name: string;

    constructor(
        @inject(Types.Service) @named(Targets.Service.EscrowService) private escrowService: EscrowService,
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType
    ) {
        this.log = new Logger(__filename);
        this.name = 'updateescrow';
    }

    @validate()
    public async execute( @request(RpcRequest) data: any): Promise<Escrow> {
        return this.escrowService.updateCheckByListingItem({
            listingItemTemplateId: data.params[0],
            type: data.params[1],
            ratio: {
                buyer: data.params[2],
                seller: data.params[3]
            }
        });
    }

    public help(): string {
        return 'UpdateEscrowCommand: TODO: Fill in help string.';
    }
}
