// Copyright (c) 2017-2018, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { inject, named } from 'inversify';
import { validate, request } from '../../../core/api/Validate';
import { Logger as LoggerType } from '../../../core/Logger';
import { Types, Core, Targets } from '../../../constants';
import { RpcRequest } from '../../requests/RpcRequest';
import { RpcCommandInterface } from './../RpcCommandInterface';
import { Commands } from './../CommandEnumType';
import { BaseCommand } from './../BaseCommand';
import { RpcCommandFactory } from '../../factories/RpcCommandFactory';
import { MessageException } from '../../exceptions/MessageException';
import { ProposalActionService } from '../../services/ProposalActionService';
import { ProfileService } from '../../services/ProfileService';
import { MarketService } from '../../services/MarketService';
import { ProposalType } from '../../enums/ProposalType';
import * as resources from 'resources';
import { SmsgSendResponse } from '../../responses/SmsgSendResponse';

export class ProposalPostCommand extends BaseCommand implements RpcCommandInterface<SmsgSendResponse> {

    public log: LoggerType;

    constructor(
        @inject(Types.Core) @named(Core.Logger) public Logger: typeof LoggerType,
        @inject(Types.Service) @named(Targets.Service.ProposalActionService) public proposalActionService: ProposalActionService,
        @inject(Types.Service) @named(Targets.Service.ProfileService) public profileService: ProfileService,
        @inject(Types.Service) @named(Targets.Service.MarketService) public marketService: MarketService
    ) {
        super(Commands.PROPOSAL_POST);
        this.log = new Logger(__filename);
    }

    /**
     * command description
     * [0] profileId
     * [1] proposalTitle
     * [2] proposalDescription
     * [3] blockStart TODO: blockStart and blockEnd should be replaced with daysRetention
     * [4] blockEnd
     * [5] estimateFee
     * [6] option1Description
     * [n...] optionNDescription
     *
     * @param data, RpcRequest
     * @param rpcCommandFactory, RpcCommandFactory
     * @returns {Promise<any>}
     */
    @validate()
    public async execute( @request(RpcRequest) data: RpcRequest, rpcCommandFactory: RpcCommandFactory): Promise<SmsgSendResponse> {

        // todo add validation in separate function..
        if (data.params.length < 8) {
            throw new MessageException('Expected more params.');
        }

        const type = ProposalType.PUBLIC_VOTE;
        const profileId = data.params.shift();
        const proposalTitle = data.params.shift();
        const proposalDescription = data.params.shift();
        const blockStart = data.params.shift();
        const blockEnd = data.params.shift();
        const estimateFee = data.params.shift();

        if (typeof profileId !== 'number') {
            throw new MessageException('profileId needs to be a number.');
        } else if (typeof blockStart !== 'number') {
            throw new MessageException('blockStart needs to be a number.');
        } else if (typeof blockEnd !== 'number') {
            throw new MessageException('blockEnd needs to be a number.');
        } else if (typeof estimateFee !== 'boolean') {
            throw new MessageException('estimateFee needs to be a boolean.');
        }

        let profile: resources.Profile;
        try {
            const profileModel = await this.profileService.findOne(profileId);
            profile = profileModel.toJSON();
        } catch ( ex ) {
            this.log.error(ex);
            throw new MessageException('Profile not found.');
        }

        // Get the default market.
        // TODO: Might want to let users specify this later.
        let market: resources.Market;
        const marketModel = await this.marketService.getDefault();
        if (!marketModel) {
            throw new MessageException(`Default market doesn't exist!`);
        }
        market = marketModel.toJSON();

        // rest of the data.params are option descriptions
        const optionsList: string[] = data.params;

        // todo: get rid of the blocks
        const daysRetention = Math.ceil((blockEnd - blockStart) / (24 * 30));
        return await this.proposalActionService.send(proposalTitle, proposalDescription, blockStart, blockEnd,
            daysRetention, optionsList, profile, market, null, estimateFee);
    }

    public usage(): string {
        return this.getName() + ' <profileId> <proposalTitle> <proposalDescription> <blockStart> <blockEnd> <estimateFee> '
            + '<option1Description> ... <optionNDescription> ';
    }

    public help(): string {
        return this.usage() + ' -  ' + this.description() + ' \n'
            + '    <profileId>              - number, ID of the Profile. \n'
            + '    <proposalTitle>          - string, Title for the Proposal. \n'
            + '    <proposalDescription>    - string, Description for the Proposal. \n'
            + '    <blockStart>             - number, Start Block for the Voting. \n'
            + '    <blockEnd>               - number, End Block for the Voting. \n'
            + '    <estimateFee>            - boolean, Just estimate the Fee, dont post the Proposal. \n'
            + '    <optionNDescription>     - string, ProposalOption description. ';
    }

    public description(): string {
        return ' Post a proposal.';
    }

    public example(): string {
        return this.getName() + ' proposal post 1 "A question of sets" "The set of all sets contains itself?" 0 1000000 YES NO';
    }
}
