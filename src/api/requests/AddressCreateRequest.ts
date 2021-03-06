// Copyright (c) 2017-2018, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import { IsNotEmpty, IsDefined, IsEnum } from 'class-validator';
import { RequestBody } from '../../core/api/RequestBody';
import {AddressType} from '../enums/AddressType';

// tslint:disable:variable-name
export class AddressCreateRequest extends RequestBody {

    @IsNotEmpty()
    public profile_id: number;

    public title: string;

    public firstName: string;
    public lastName: string;

    @IsNotEmpty()
    public addressLine1: string;
    public addressLine2: string;

    @IsNotEmpty()
    public city: string;

    @IsDefined()
    public state: string;

    @IsNotEmpty()
    public country: string;

    @IsNotEmpty()
    public zipCode: string;

    @IsNotEmpty()
    public type: AddressType;

}
// tslint:enable:variable-name
