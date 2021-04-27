import {AbiItem} from 'web3-utils/types';
import {act, renderHook} from '@testing-library/react-hooks';
import {VoteChoices, SnapshotType} from '@openlaw/snapshot-js-erc712';
import {waitFor} from '@testing-library/react';
import Web3 from 'web3';

import {
  DEFAULT_ETH_ADDRESS,
  DEFAULT_PROPOSAL_HASH,
  FakeHttpProvider,
} from '../../../test/helpers';
import {
  ProposalData,
  ProposalFlowStatus,
  SnapshotDraft,
  SnapshotProposal,
} from '../types';
import {BURN_ADDRESS} from '../../../util/constants';
import {proposalHasVotingState} from '../helpers';
import {useProposalWithOffchainVoteStatus} from '.';
import {VotingAdapterName} from '../../adapters-extensions/enums';
import {VotingState} from '../voting/types';
import OffchainVotingABI from '../../../truffle-contracts/OffchainVotingContract.json';
import Wrapper from '../../../test/Wrapper';

const nowSeconds = Date.now() / 1000;

const fakeSnapshotProposal: SnapshotProposal = {
  msg: {
    payload: {
      snapshot: 123,
      name: '',
      body: '',
      choices: [VoteChoices.Yes, VoteChoices.No],
      metadata: {},
      start: nowSeconds - 5,
      end: nowSeconds + 5,
    },
    version: '',
    timestamp: '',
    token: '',
    type: SnapshotType.proposal,
  },
  actionId: '',
  address: '',
  authorIpfsHash: '',
  data: {authorIpfsHash: ''},
  idInDAO: DEFAULT_PROPOSAL_HASH,
  idInSnapshot: DEFAULT_PROPOSAL_HASH,
  relayerIpfsHash: '',
  sig: '',
  votes: [],
};

const fakeSnapshotDraft: SnapshotDraft = {
  msg: {
    payload: {
      name: '',
      body: '',
      choices: [VoteChoices.Yes, VoteChoices.No],
      metadata: {},
    },
    version: '',
    timestamp: '',
    token: '',
    type: SnapshotType.draft,
  },
  actionId: '',
  address: '',
  authorIpfsHash: '',
  data: {authorIpfsHash: '', sponsored: false},
  idInDAO: DEFAULT_PROPOSAL_HASH,
  idInSnapshot: DEFAULT_PROPOSAL_HASH,
  relayerIpfsHash: '',
  sig: '',
};

const defaultVotesMock = [
  {
    Voting: {
      snapshot: 'uint256',
      proposalHash: 'bytes32',
      reporter: 'address',
      resultRoot: 'bytes32',
      nbYes: 'uint256',
      nbNo: 'uint256',
      index: 'uint256',
      startingTime: 'uint256',
      gracePeriodStartingTime: 'uint256',
      isChallenged: 'bool',
      fallbackVotesCount: 'uint256',
    },
  },
  {
    fallbackVotesCount: '0',
    gracePeriodStartingTime: '1617964640',
    index: '0',
    isChallenged: false,
    nbNo: '0',
    nbYes: '1',
    proposalHash: DEFAULT_PROPOSAL_HASH,
    reporter: '0xf9731Ad60BeCA05E9FB7aE8Dd4B63BFA49675b68',
    resultRoot:
      '0x9298a7fccdf7655408a8106ff03c9cbf0610082cc0f00dfe4c8f73f57a60df71',
    snapshot: '8376297',
    startingTime: '1617878162',
  },
];

const defaultVotesResult = {
  '0': '8376297',
  '1': DEFAULT_PROPOSAL_HASH,
  '10': '0',
  '2': '0xf9731Ad60BeCA05E9FB7aE8Dd4B63BFA49675b68',
  '3': '0x9298a7fccdf7655408a8106ff03c9cbf0610082cc0f00dfe4c8f73f57a60df71',
  '4': '1',
  '5': '0',
  '6': '0',
  '7': '1617878162',
  '8': '1617964640',
  '9': false,
  __length__: 11,
  fallbackVotesCount: '0',
  gracePeriodStartingTime: '1617964640',
  index: '0',
  isChallenged: false,
  nbNo: '0',
  nbYes: '1',
  proposalHash: DEFAULT_PROPOSAL_HASH,
  reporter: '0xf9731Ad60BeCA05E9FB7aE8Dd4B63BFA49675b68',
  resultRoot:
    '0x9298a7fccdf7655408a8106ff03c9cbf0610082cc0f00dfe4c8f73f57a60df71',
  snapshot: '8376297',
  startingTime: '1617878162',
};

const defaultNoVotesMock = [
  {
    Voting: {
      snapshot: 'uint256',
      proposalHash: 'bytes32',
      reporter: 'address',
      resultRoot: 'bytes32',
      nbYes: 'uint256',
      nbNo: 'uint256',
      index: 'uint256',
      startingTime: 'uint256',
      gracePeriodStartingTime: 'uint256',
      isChallenged: 'bool',
      fallbackVotesCount: 'uint256',
    },
  },
  {
    snapshot: '0',
    proposalHash:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    reporter: BURN_ADDRESS,
    resultRoot:
      '0x0000000000000000000000000000000000000000000000000000000000000000',
    nbYes: '0',
    nbNo: '0',
    index: '0',
    startingTime: '0',
    gracePeriodStartingTime: '0',
    isChallenged: false,
    fallbackVotesCount: '0',
  },
];

const defaultNoVotesResult = {
  '0': '0',
  '1': '0x0000000000000000000000000000000000000000000000000000000000000000',
  '10': '0',
  '2': BURN_ADDRESS,
  '3': '0x0000000000000000000000000000000000000000000000000000000000000000',
  '4': '0',
  '5': '0',
  '6': '0',
  '7': '0',
  '8': '0',
  '9': false,
  __length__: 11,
  fallbackVotesCount: '0',
  gracePeriodStartingTime: '0',
  index: '0',
  isChallenged: false,
  nbNo: '0',
  nbYes: '0',
  proposalHash:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  reporter: BURN_ADDRESS,
  resultRoot:
    '0x0000000000000000000000000000000000000000000000000000000000000000',
  snapshot: '0',
  startingTime: '0',
};

describe('useProposalWithOffchainVoteStatus unit tests', () => {
  test('should return correct data from hook when status is `ProposalFlowStatus.Sponsor`', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: undefined,
      snapshotDraft: fakeSnapshotDraft,
    };

    let mockWeb3Provider: FakeHttpProvider;
    let web3Instance: Web3;

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: (p) => {
              mockWeb3Provider = p.mockWeb3Provider;
              web3Instance = p.web3Instance;
            },
          },
        }
      );

      await waitFor(() => {
        mockWeb3Provider.injectResult(
          web3Instance.eth.abi.encodeParameters(
            ['uint256', 'bytes[]'],
            [
              0,
              [
                // For `proposals` call
                web3Instance.eth.abi.encodeParameter(
                  {
                    Proposal: {
                      adapterAddress: 'address',
                      flags: 'uint256',
                    },
                  },
                  {
                    adapterAddress: DEFAULT_ETH_ADDRESS,
                    // ProposalFlag.EXISTS
                    flags: '1',
                  }
                ),
              ],
            ]
          )
        );
      });

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '1',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '1',
      });

      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(ProposalFlowStatus.Sponsor);
    });
  });

  test('should return correct data from hook when status is `ProposalFlowStatus.OffchainVoting`', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: fakeSnapshotProposal,
    };

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: ({mockWeb3Provider, web3Instance}) => {
              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.SPONSORED
                          flags: '3',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultNoVotesMock[0],
                        defaultNoVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.IN_PROGRESS)
                      web3Instance.eth.abi.encodeParameter('uint8', '4'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '3',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '3',
      });

      expect(
        proposalHasVotingState(
          VotingState.IN_PROGRESS,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(
        defaultNoVotesResult
      );

      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.status);

      expect(result.current.status).toBe(ProposalFlowStatus.OffchainVoting);
    });
  });

  test('should return correct data from hook when status is `ProposalFlowStatus.OffchainVotingSubmitResult`', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: {
        ...fakeSnapshotProposal,
        msg: {
          ...fakeSnapshotProposal.msg,
          payload: {
            ...fakeSnapshotProposal.msg.payload,
            // Set Snapshot offchain voting time as ended
            start: nowSeconds - 100,
            end: nowSeconds - 50,
          },
        },
      },
    };

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: ({mockWeb3Provider, web3Instance}) => {
              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.SPONSORED
                          flags: '3',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultNoVotesMock[0],
                        defaultNoVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.GRACE_PERIOD)
                      web3Instance.eth.abi.encodeParameter('uint8', '5'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '3',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '3',
      });

      expect(
        proposalHasVotingState(
          VotingState.GRACE_PERIOD,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(
        defaultNoVotesResult
      );

      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.status);

      expect(result.current.status).toBe(
        ProposalFlowStatus.OffchainVotingSubmitResult
      );
    });
  });

  test('should return correct data from hook when status is `ProposalFlowStatus.OffchainVotingGracePeriod`', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: {
        ...fakeSnapshotProposal,
        msg: {
          ...fakeSnapshotProposal.msg,
          payload: {
            ...fakeSnapshotProposal.msg.payload,
            // Set Snapshot offchain voting time as ended
            start: nowSeconds - 100,
            end: nowSeconds - 50,
          },
        },
      },
    };

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: ({mockWeb3Provider, web3Instance}) => {
              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.SPONSORED
                          flags: '3',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultVotesMock[0],
                        defaultVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.GRACE_PERIOD)
                      web3Instance.eth.abi.encodeParameter('uint8', '5'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '3',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '3',
      });

      expect(
        proposalHasVotingState(
          VotingState.GRACE_PERIOD,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(defaultVotesResult);

      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.status);

      expect(result.current.status).toBe(
        ProposalFlowStatus.OffchainVotingGracePeriod
      );
    });
  });

  test('should return correct data from hook when status is `ProposalFlowStatus.Process`', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: {
        ...fakeSnapshotProposal,
        msg: {
          ...fakeSnapshotProposal.msg,
          payload: {
            ...fakeSnapshotProposal.msg.payload,
            // Set Snapshot offchain voting time as ended
            start: nowSeconds - 100,
            end: nowSeconds - 50,
          },
        },
      },
    };

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: ({mockWeb3Provider, web3Instance}) => {
              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.SPONSORED
                          flags: '3',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultVotesMock[0],
                        defaultVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.PASS)
                      web3Instance.eth.abi.encodeParameter('uint8', '2'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '3',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '3',
      });

      expect(
        proposalHasVotingState(
          VotingState.PASS,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(defaultVotesResult);

      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.status);

      expect(result.current.status).toBe(ProposalFlowStatus.Process);
    });
  });

  test('should return correct data from hook when status is `ProposalFlowStatus.Completed`', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: {
        ...fakeSnapshotProposal,
        msg: {
          ...fakeSnapshotProposal.msg,
          payload: {
            ...fakeSnapshotProposal.msg.payload,
            // Set Snapshot offchain voting time as ended
            start: nowSeconds - 100,
            end: nowSeconds - 50,
          },
        },
      },
    };

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: ({mockWeb3Provider, web3Instance}) => {
              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.PROCESSED
                          flags: '7',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultVotesMock[0],
                        defaultVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.PASS)
                      web3Instance.eth.abi.encodeParameter('uint8', '2'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '7',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '7',
      });

      expect(
        proposalHasVotingState(
          VotingState.PASS,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(defaultVotesResult);

      expect(result.current.status).toBe(ProposalFlowStatus.Completed);
    });
  });

  // @note This test uses higher timeouts
  test('should poll for data when proposal is not processed', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: {
        ...fakeSnapshotProposal,
        msg: {
          ...fakeSnapshotProposal.msg,
          payload: {
            ...fakeSnapshotProposal.msg.payload,
            // Set Snapshot offchain voting time as ended
            start: nowSeconds - 100,
            end: nowSeconds - 50,
          },
        },
      },
    };

    let mockWeb3Provider: FakeHttpProvider;
    let web3Instance: Web3;

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: (p) => {
              mockWeb3Provider = p.mockWeb3Provider;
              web3Instance = p.web3Instance;

              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.SPONSORED
                          flags: '3',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultVotesMock[0],
                        defaultVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.GRACE_PERIOD)
                      web3Instance.eth.abi.encodeParameter('uint8', '5'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '3',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '3',
      });

      expect(
        proposalHasVotingState(
          VotingState.GRACE_PERIOD,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(defaultVotesResult);

      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.status);

      expect(result.current.status).toBe(
        ProposalFlowStatus.OffchainVotingGracePeriod
      );

      // Update the mock Web3 result for after polling
      await waitFor(() => {
        mockWeb3Provider.injectResult(
          web3Instance.eth.abi.encodeParameters(
            ['uint256', 'bytes[]'],
            [
              0,
              [
                // For `proposals` call
                web3Instance.eth.abi.encodeParameter(
                  {
                    Proposal: {
                      adapterAddress: 'address',
                      flags: 'uint256',
                    },
                  },
                  {
                    adapterAddress: DEFAULT_ETH_ADDRESS,
                    // ProposalFlag.SPONSORED
                    flags: '3',
                  }
                ),
                // For `votes` call
                web3Instance.eth.abi.encodeParameter(
                  defaultVotesMock[0],
                  defaultVotesMock[1]
                ),
                // For `voteResult` call (VotingState.PASS)
                web3Instance.eth.abi.encodeParameter('uint8', '2'),
              ],
            ]
          )
        );
      });

      await waitForValueToChange(() => result.current.status, {timeout: 15000});

      // After polling the `status` should change
      await waitFor(() => {
        expect(result.current.status).toBe(ProposalFlowStatus.Process);
      });
    });
  }, 15000); // Set jest timeout for this test to a higher value to detect polling

  test('should return error when async call throws on initial fetch', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: undefined,
      snapshotDraft: fakeSnapshotDraft,
    };

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: ({mockWeb3Provider, web3Instance}) => {
              mockWeb3Provider.injectError({
                code: 1234,
                message: 'Some bad error.',
              });

              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.EXISTS
                          flags: '1',
                        }
                      ),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);
      expect(result.current.proposalFlowStatusError).toBe(undefined);

      await waitForValueToChange(() => result.current.proposalFlowStatusError);

      expect(result.current.proposalFlowStatusError?.message).toMatch(
        /some bad error\./i
      );
    });
  });

  // @note This test uses higher timeouts
  test('should return error when async call throws during polling', async () => {
    const proposalData: Partial<ProposalData> = {
      daoProposalVotingAdapter: {
        votingAdapterAddress: DEFAULT_ETH_ADDRESS,
        votingAdapterName: VotingAdapterName.OffchainVotingContract,
        getVotingAdapterABI: () => OffchainVotingABI as AbiItem[],
        getWeb3VotingAdapterContract: () => undefined as any,
      },
      snapshotProposal: {
        ...fakeSnapshotProposal,
        msg: {
          ...fakeSnapshotProposal.msg,
          payload: {
            ...fakeSnapshotProposal.msg.payload,
            // Set Snapshot offchain voting time as ended
            start: nowSeconds - 100,
            end: nowSeconds - 50,
          },
        },
      },
    };

    let mockWeb3Provider: FakeHttpProvider;
    let web3Instance: Web3;

    await act(async () => {
      const {result, waitForValueToChange} = await renderHook(
        () => useProposalWithOffchainVoteStatus(proposalData as ProposalData),
        {
          wrapper: Wrapper,
          initialProps: {
            useInit: true,
            useWallet: true,
            getProps: (p) => {
              mockWeb3Provider = p.mockWeb3Provider;
              web3Instance = p.web3Instance;

              mockWeb3Provider.injectResult(
                web3Instance.eth.abi.encodeParameters(
                  ['uint256', 'bytes[]'],
                  [
                    0,
                    [
                      // For `proposals` call
                      web3Instance.eth.abi.encodeParameter(
                        {
                          Proposal: {
                            adapterAddress: 'address',
                            flags: 'uint256',
                          },
                        },
                        {
                          adapterAddress: DEFAULT_ETH_ADDRESS,
                          // ProposalFlag.SPONSORED
                          flags: '3',
                        }
                      ),
                      // For `votes` call
                      web3Instance.eth.abi.encodeParameter(
                        defaultVotesMock[0],
                        defaultVotesMock[1]
                      ),
                      // For `voteResult` call (VotingState.GRACE_PERIOD)
                      web3Instance.eth.abi.encodeParameter('uint8', '5'),
                    ],
                  ]
                )
              );
            },
          },
        }
      );

      // Assert initial state
      expect(result.current.daoProposal).toBe(undefined);
      expect(result.current.daoProposalVoteResult).toBe(undefined);
      expect(result.current.daoProposalVotes).toBe(undefined);
      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.daoProposal);

      expect(result.current.daoProposal).toMatchObject({
        '0': '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        '1': '3',
        __length__: 2,
        adapterAddress: '0x04028Df0Cea639E97fDD3fC01bA5CC172613211D',
        flags: '3',
      });

      expect(
        proposalHasVotingState(
          VotingState.GRACE_PERIOD,
          result.current.daoProposalVoteResult || ''
        )
      ).toBe(true);

      expect(result.current.daoProposalVotes).toMatchObject(defaultVotesResult);

      expect(result.current.status).toBe(undefined);

      await waitForValueToChange(() => result.current.status);

      expect(result.current.status).toBe(
        ProposalFlowStatus.OffchainVotingGracePeriod
      );

      // Update the mock Web3 result for after polling
      await waitFor(() => {
        mockWeb3Provider.injectResult(
          web3Instance.eth.abi.encodeParameters(
            ['uint256', 'bytes[]'],
            [
              0,
              [
                // For `proposals` call
                web3Instance.eth.abi.encodeParameter(
                  {
                    Proposal: {
                      adapterAddress: 'address',
                      flags: 'uint256',
                    },
                  },
                  {
                    adapterAddress: DEFAULT_ETH_ADDRESS,
                    // ProposalFlag.SPONSORED
                    flags: '3',
                  }
                ),
                // For `votes` call
                web3Instance.eth.abi.encodeParameter(
                  defaultVotesMock[0],
                  defaultVotesMock[1]
                ),
                // For `voteResult` call (VotingState.PASS)
                web3Instance.eth.abi.encodeParameter('uint8', '2'),
              ],
            ]
          )
        );

        mockWeb3Provider.injectError({
          code: 1234,
          message: 'Some bad error.',
        });
      });

      await waitForValueToChange(() => result.current.proposalFlowStatusError, {
        timeout: 15000,
      });

      expect(result.current.proposalFlowStatusError?.message).toMatch(
        /some bad error\./i
      );
    });
  }, 15000); // Set jest timeout for this test to a higher value to detect polling
});