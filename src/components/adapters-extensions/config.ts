import {DaoConstants} from './enums';
import {getAdapterOrExtensionId} from './helpers';

import {
  DEFAULT_CHAIN,
  BANK_EXTENSION_CONTRACT_ADDRESS,
  CONFIGURATION_CONTRACT_ADDRESS,
  FINANCING_CONTRACT_ADDRESS,
  GUILDKICK_CONTRACT_ADDRESS,
  MANAGING_CONTRACT_ADDRESS,
  ONBOARDING_CONTRACT_ADDRESS,
  RAGEQUIT_CONTRACT_ADDRESS,
  TRIBUTE_CONTRACT_ADDRESS,
  VOTING_CONTRACT_ADDRESS,
  WITHDRAW_CONTRACT_ADDRESS,
  OFFCHAINVOTING_CONTRACT_ADDRESS,
  DISTRIBUTE_CONTRACT_ADDRESS,
} from '../../config';

type AdapterProps = {
  adapterId?: string;
  extensionId?: string;
  name: string;
  contractAddress: string;
  description: string;
};

export type AdaptersAndExtensionsType = {
  isExtension?: boolean;
  options?: Omit<
    AdapterProps,
    'adapterId' | 'extensionId' | 'name' | 'description' | 'contractAddress'
  >;
  optionDefaultTarget?: DaoConstants;
} & Partial<AdapterProps>;

/**
 * @note README [IMPORTANT]
 *
 *    HOW TO ADD A NEW DEFAULT ADAPTER OR EXTENSION
 *
 * 1. Add the new contract address to the `./src/config.ts`
 *    list ie: <NAME-OF-NEW-CONTRACT>_CONTRACT_ADDRESS
 *
 * 2. Create a new object in the following variable `defaultAdaptersAndExtensions`
 *    - Extensions: must have the key/value pair set `isExtension: true`
 *    - Choosing an adapter/extension from a group: must be defined within a nested `options` key
 */
export const defaultAdaptersAndExtensions: AdaptersAndExtensionsType[] = [
  {
    isExtension: true,
    name: DaoConstants.BANK,
    extensionId: getAdapterOrExtensionId(DaoConstants.BANK),
    contractAddress: BANK_EXTENSION_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Adds the banking capabilities to the DAO, and keeps track of the DAO accounts and internal token balances.',
  },
  {
    name: DaoConstants.CONFIGURATION,
    adapterId: getAdapterOrExtensionId(DaoConstants.CONFIGURATION),
    contractAddress: CONFIGURATION_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Manages storing and retrieving per-DAO settings required by shared adapters.',
  },
  {
    name: DaoConstants.DISTRIBUTE,
    adapterId: getAdapterOrExtensionId(DaoConstants.DISTRIBUTE),
    contractAddress: DISTRIBUTE_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Allows the members to distribute funds to one or all members of the DAO.',
  },
  {
    name: DaoConstants.FINANCING,
    adapterId: getAdapterOrExtensionId(DaoConstants.FINANCING),
    contractAddress: FINANCING_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Allows individuals and/or organizations to request funds to finance their projects, and the members of the DAO have the power to vote and decide which projects should be funded.',
  },
  {
    name: DaoConstants.GUILDKICK,
    adapterId: getAdapterOrExtensionId(DaoConstants.GUILDKICK),
    contractAddress: GUILDKICK_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Gives the members the freedom to choose which individuals or organizations should really be part of the DAO.',
  },
  {
    name: DaoConstants.MANAGING,
    adapterId: getAdapterOrExtensionId(DaoConstants.MANAGING),
    contractAddress: MANAGING_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Enhances the DAO capabilities by adding/updating the DAO Adapters through a voting process.',
  },
  {
    name: DaoConstants.ONBOARDING,
    adapterId: getAdapterOrExtensionId(DaoConstants.ONBOARDING),
    contractAddress: ONBOARDING_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Triggers the process of minting internal tokens in exchange of a specific token at a fixed price.',
  },
  {
    name: DaoConstants.RAGEQUIT,
    adapterId: getAdapterOrExtensionId(DaoConstants.RAGEQUIT),
    contractAddress: RAGEQUIT_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Gives the members the freedom to choose when it is the best time to exit the DAO for any given reason.',
  },
  {
    name: DaoConstants.TRIBUTE,
    adapterId: getAdapterOrExtensionId(DaoConstants.TRIBUTE),
    contractAddress: TRIBUTE_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Allows potential and existing DAO members to contribute any amount of ERC-20 tokens to the DAO in exchange for any amount of DAO internal tokens.',
  },
  {
    options: [
      {
        name: DaoConstants.VOTING,
        displayName: DaoConstants.OFFCHAINVOTING,
        adapterId: getAdapterOrExtensionId(DaoConstants.VOTING),
        contractAddress: OFFCHAINVOTING_CONTRACT_ADDRESS[DEFAULT_CHAIN],
        description:
          'Adds the offchain voting governance process to the DAO to support gasless voting.',
      },
      {
        name: DaoConstants.VOTING,
        displayName: DaoConstants.VOTING,
        adapterId: getAdapterOrExtensionId(DaoConstants.VOTING),
        contractAddress: VOTING_CONTRACT_ADDRESS[DEFAULT_CHAIN],
        description:
          'Adds the simple on chain voting governance process to the DAO.',
      },
    ],
    optionDefaultTarget: DaoConstants.VOTING,
  },
  {
    name: DaoConstants.WITHDRAW,
    adapterId: getAdapterOrExtensionId(DaoConstants.WITHDRAW),
    contractAddress: WITHDRAW_CONTRACT_ADDRESS[DEFAULT_CHAIN],
    description:
      'Allows the members to withdraw their funds from the DAO bank.',
  },
];