// Copyright (c) 2017-2018, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { IsNotEmpty } from 'class-validator';
import { RequestBody } from '../../core/api/RequestBody';

// tslint:disable:variable-name
export class ProposalResultCreateRequest extends RequestBody {

    @IsNotEmpty()
    public proposal_id: number;

    @IsNotEmpty()
    public block: number;

}
// tslint:enable:variable-name
