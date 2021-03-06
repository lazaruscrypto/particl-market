// Copyright (c) 2017-2018, The Particl Market developers
// Distributed under the GPL software license, see the accompanying
// file COPYING or https://github.com/particl/particl-market/blob/develop/LICENSE

import * from 'jest';
import { app } from '../../src/app';
import { Logger as LoggerType } from '../../src/core/Logger';
import { Types, Core, Targets } from '../../src/constants';
import { TestUtil } from './lib/TestUtil';
import { TestDataService } from '../../src/api/services/TestDataService';
import { ValidationException } from '../../src/api/exceptions/ValidationException';
import { NotFoundException } from '../../src/api/exceptions/NotFoundException';
import { Proposal } from '../../src/api/models/Proposal';
import { ProposalService } from '../../src/api/services/ProposalService';
import { ProposalType } from '../../src/api/enums/ProposalType';
import { ProposalCreateRequest } from '../../src/api/requests/ProposalCreateRequest';
import { ProposalUpdateRequest } from '../../src/api/requests/ProposalUpdateRequest';
import { HashableObjectType } from '../../src/api/enums/HashableObjectType';
import { ObjectHash } from '../../src/core/helpers/ObjectHash';
import { ProposalOptionCreateRequest } from '../../src/api/requests/ProposalOptionCreateRequest';
import { ProposalSearchParams } from '../../src/api/requests/ProposalSearchParams';
import { SearchOrder } from '../../src/api/enums/SearchOrder';

describe('Proposal', () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = process.env.JASMINE_TIMEOUT;

    const log: LoggerType = new LoggerType(__filename);
    const testUtil = new TestUtil();

    let testDataService: TestDataService;
    let proposalService: ProposalService;

    let createdId;

    const testData = {
        submitter: 'pasdfasfsdfad',
        blockStart: 1000,
        blockEnd: 1010,
        type: ProposalType.PUBLIC_VOTE,
        title:  'proposal x title',
        description: 'proposal to x',
        expiryTime: 4,
        postedAt: new Date().getTime(),
        expiredAt: new Date().getTime() + 100000000,
        receivedAt: new Date().getTime()
    } as ProposalCreateRequest;

    const testDataOptions = [{
        description: 'one'
    }, {
        description: 'two'
    }, {
        description: 'three'
    }] as ProposalOptionCreateRequest[];

    const testDataUpdated = {
        submitter: 'pqwer',
        blockStart: 1212,
        blockEnd: 1313,
        type: ProposalType.PUBLIC_VOTE,
        title:  'proposal y title',
        description: 'proposal to y'
    } as ProposalUpdateRequest;


    beforeAll(async () => {
        await testUtil.bootstrapAppContainer(app);  // bootstrap the app

        testDataService = app.IoC.getNamed<TestDataService>(Types.Service, Targets.Service.TestDataService);
        proposalService = app.IoC.getNamed<ProposalService>(Types.Service, Targets.Service.ProposalService);

        // clean up the db, first removes all data and then seeds the db with default data
        await testDataService.clean();
    });

    test('Should throw ValidationException because we want to create a empty Proposal', async () => {
        expect.assertions(1);
        await proposalService.create({} as ProposalCreateRequest).catch(e =>
            expect(e).toEqual(new ValidationException('Request body is not valid', []))
        );
    });

    test('Should create a new Proposal', async () => {

        const proposalModel: Proposal = await proposalService.create(testData);
        const result = proposalModel.toJSON();

        expect(result.submitter).toBe(testData.submitter);
        expect(result.blockStart).toBe(testData.blockStart);
        expect(result.blockEnd).toBe(testData.blockEnd);
        expect(result.type).toBe(testData.type);
        expect(result.title).toBe(testData.title);
        expect(result.description).toBe(testData.description);

        createdId = result.id;

        // todo: should test that creating proposal with options works too..
    });

    test('Should list Proposals with our newly created one', async () => {
        const proposalCollection = await proposalService.findAll();
        const proposal = proposalCollection.toJSON();
        expect(proposal.length).toBe(1);

        const result = proposal[0];
        expect(result.submitter).toBe(testData.submitter);
        expect(result.blockStart).toBe(testData.blockStart);
        expect(result.blockEnd).toBe(testData.blockEnd);
        expect(result.submitter).toBe(testData.submitter);
        expect(result.type).toBe(testData.type);
        expect(result.title).toBe(testData.title);
        expect(result.description).toBe(testData.description);
    });

    test('Should return one Proposal', async () => {
        const proposalModel: Proposal = await proposalService.findOne(createdId);
        const result = proposalModel.toJSON();

        expect(result.submitter).toBe(testData.submitter);
        expect(result.blockStart).toBe(testData.blockStart);
        expect(result.blockEnd).toBe(testData.blockEnd);
        expect(result.submitter).toBe(testData.submitter);
        expect(result.type).toBe(testData.type);
        expect(result.title).toBe(testData.title);
        expect(result.description).toBe(testData.description);
    });

    test('Should update the Proposal', async () => {

        const proposalModel: Proposal = await proposalService.update(createdId, testDataUpdated);
        const result = proposalModel.toJSON();

        expect(result.submitter).toBe(testDataUpdated.submitter);
        expect(result.blockStart).toBe(testDataUpdated.blockStart);
        expect(result.blockEnd).toBe(testDataUpdated.blockEnd);
        expect(result.submitter).toBe(testDataUpdated.submitter);
        expect(result.type).toBe(testDataUpdated.type);
        expect(result.title).toBe(testDataUpdated.title);
        expect(result.description).toBe(testDataUpdated.description);
    });

    test('Should delete the Proposal', async () => {
        expect.assertions(1);
        await proposalService.destroy(createdId);
        await proposalService.findOne(createdId).catch(e =>
            expect(e).toEqual(new NotFoundException(createdId))
        );
    });

    test('Should create a new Proposal with ProposalOptions', async () => {

        testData.options = testDataOptions;

        const proposalModel: Proposal = await proposalService.create(testData);
        createdId = proposalModel.Id;

        const result = proposalModel.toJSON();

        expect(result.submitter).toBe(testData.submitter);
        expect(result.blockStart).toBe(testData.blockStart);
        expect(result.blockEnd).toBe(testData.blockEnd);
        expect(result.type).toBe(testData.type);
        expect(result.title).toBe(testData.title);
        expect(result.description).toBe(testData.description);

        expect(result.ProposalOptions).toBeDefined();
        expect(result.ProposalOptions).toHaveLength(3);
    });

    test('Should create another Proposal with different blockStart and blockEnd', async () => {

        testData.options = testDataOptions;
        testData.blockStart = 1005;
        testData.blockEnd = 1015;

        const proposalModel: Proposal = await proposalService.create(testData);
        createdId = proposalModel.Id;

        const result = proposalModel.toJSON();

        expect(result.submitter).toBe(testData.submitter);
        expect(result.blockStart).toBe(testData.blockStart);
        expect(result.blockEnd).toBe(testData.blockEnd);
        expect(result.type).toBe(testData.type);
        expect(result.title).toBe(testData.title);
        expect(result.description).toBe(testData.description);

        expect(result.ProposalOptions).toBeDefined();
        expect(result.ProposalOptions).toHaveLength(3);
    });

    test('Should search Proposals open after block 1000', async () => {

        const searchParams = {
            startBlock: 1000,
            endBlock: '*',
            order: SearchOrder.ASC,
            type: ProposalType.PUBLIC_VOTE
        } as ProposalSearchParams;

        const proposalCollection = await proposalService.searchBy(searchParams, true);
        const proposals = proposalCollection.toJSON();
        expect(proposals).toHaveLength(2);
    });

    test('Should search Proposals open after and at block 1010', async () => {

        const searchParams = {
            startBlock: 1010,
            endBlock: '*',
            order: SearchOrder.ASC,
            type: ProposalType.PUBLIC_VOTE
        } as ProposalSearchParams;

        const proposalCollection = await proposalService.searchBy(searchParams, true);
        const proposals = proposalCollection.toJSON();
        expect(proposals).toHaveLength(2);
    });

    test('Should search Proposals open after and at block 1011', async () => {

        const searchParams = {
            startBlock: 1011,
            endBlock: '*',
            order: SearchOrder.ASC,
            type: ProposalType.PUBLIC_VOTE
        } as ProposalSearchParams;

        const proposalCollection = await proposalService.searchBy(searchParams, true);
        const proposals = proposalCollection.toJSON();
        expect(proposals).toHaveLength(1);
    });

    test('Should search Proposals closed before or at block 1010', async () => {

        const searchParams = {
            startBlock: '*',
            endBlock: 1010,
            order: SearchOrder.ASC,
            type: ProposalType.PUBLIC_VOTE
        } as ProposalSearchParams;

        const proposalCollection = await proposalService.searchBy(searchParams, true);
        const proposals = proposalCollection.toJSON();
        expect(proposals).toHaveLength(1);
    });

    test('Should create another Proposal with type ITEM_VOTE', async () => {

        testData.type = ProposalType.ITEM_VOTE;

        const proposalModel: Proposal = await proposalService.create(testData);
        createdId = proposalModel.Id;

        const result = proposalModel.toJSON();

        expect(result.submitter).toBe(testData.submitter);
        expect(result.blockStart).toBe(testData.blockStart);
        expect(result.blockEnd).toBe(testData.blockEnd);
        expect(result.type).toBe(testData.type);
        expect(result.title).toBe(testData.title);
        expect(result.description).toBe(testData.description);

        expect(result.ProposalOptions).toBeDefined();
        expect(result.ProposalOptions).toHaveLength(3);
    });

    test('Should search Proposals with type ITEM_VOTE', async () => {

        const searchParams = {
            startBlock: '*',
            endBlock: '*',
            order: SearchOrder.ASC,
            type: ProposalType.ITEM_VOTE
        } as ProposalSearchParams;

        const proposalCollection = await proposalService.searchBy(searchParams, true);
        const proposals = proposalCollection.toJSON();
        expect(proposals).toHaveLength(1);
    });

});
