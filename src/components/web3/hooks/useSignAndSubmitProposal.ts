import {useState} from 'react';
import {useSelector} from 'react-redux';
import {
  buildDraftMessage,
  buildProposalMessage,
  getDomainDefinition,
  getSpace,
  signMessage,
  SnapshotDraftData,
  SnapshotMessageBase,
  SnapshotMessageProposal,
  SnapshotProposalData,
  SnapshotSubmitBaseReturn,
  SnapshotSubmitProposalReturn,
  SnapshotType,
  submitMessage,
} from '@openlaw/snapshot-js-erc712';

import {
  ContractAdapterNames,
  ContractDAOConfigKeys,
  Web3TxStatus,
} from '../types';
import {DEFAULT_CHAIN, SNAPSHOT_HUB_API_URL, SPACE} from '../../../config';
import {getAdapterAddressFromContracts, getDAOConfigEntry} from '../helpers';
import {PRIMARY_TYPE_ERC712} from '../config';
import {StoreState} from '../../../util/types';
import {useWeb3Modal} from './useWeb3Modal';

type PrepareAndSignProposalDataParam = {
  body: SnapshotProposalData['payload']['body'];
  name: SnapshotProposalData['payload']['name'];
  metadata: SnapshotProposalData['payload']['metadata'];
  /**
   * Helpful for Proposal types when hashes between created Drafts
   * and yet to be created Proposals need to match.
   */
  timestamp?: SnapshotProposalData['timestamp'];
};

type UseSignAndSubmitProposalReturn = {
  signAndSendProposal: (
    partialProposalData: PrepareAndSignProposalDataParam,
    adapterName: ContractAdapterNames,
    type: SnapshotProposalData['type']
  ) => Promise<SignAndSendProposalReturn>;
  proposalData: SignAndSendProposalReturn | undefined;
  proposalSignAndSendError: Error | undefined;
  proposalSignAndSendStatus: Web3TxStatus;
};

type SignAndSendProposalReturn = {
  data: SnapshotDraftData;
  signature: string;
  uniqueId: SnapshotSubmitBaseReturn['uniqueId'];
  uniqueIdDraft: SnapshotSubmitProposalReturn['uniqueIdDraft'];
};

/**
 * useSignAndSubmitProposal
 *
 * React hook which prepares proposal data for submission
 * to Snapshot and Moloch v3 and signs it (ERC712)
 *
 * @returns {Promise<UseSignAndSubmitProposalReturn>} An object with the proposal data and the ERC712 signature string.
 */
export function useSignAndSubmitProposal(): UseSignAndSubmitProposalReturn {
  /**
   * Selectors
   */

  const daoRegistryAddress = useSelector(
    (state: StoreState) => state.contracts.DaoRegistryContract?.contractAddress
  );
  const daoRegistryInstance = useSelector(
    (state: StoreState) => state.contracts.DaoRegistryContract?.instance
  );
  const contracts = useSelector((state: StoreState) => state.contracts);

  /**
   * Our hooks
   */

  const {account, provider, web3Instance} = useWeb3Modal();

  /**
   * State
   */

  const [proposalData, setProposalData] = useState<SignAndSendProposalReturn>();
  const [
    proposalSignAndSendError,
    setProposalSignAndSendError,
  ] = useState<Error>();
  const [
    proposalSignAndSendStatus,
    setProposalSignAndSendStatus,
  ] = useState<Web3TxStatus>(Web3TxStatus.STANDBY);

  /**
   * Functions
   */

  /**
   * A wrapper to clearly separate the running of functions
   * specific to Proposals.
   *
   * @param {SnapshotMessageBase & Partial<SnapshotMessageProposal>} commonData
   * @returns {Promise<SnapshotProposalData>}
   */
  async function buildProposalMessageHelper(
    commonData: SnapshotMessageBase & Partial<SnapshotMessageProposal>
  ): Promise<SnapshotProposalData> {
    if (!SNAPSHOT_HUB_API_URL) {
      throw new Error('No "SNAPSHOT_HUB_API_URL" was found.');
    }

    const snapshot: number = await web3Instance.eth.getBlockNumber();

    const votingTimeSeconds: number = parseInt(
      await getDAOConfigEntry(
        ContractDAOConfigKeys.offchainVotingVotingPeriod,
        daoRegistryInstance
      )
    );

    return await buildProposalMessage(
      {
        ...commonData,
        votingTimeSeconds,
        snapshot,
      },
      SNAPSHOT_HUB_API_URL
    );
  }

  /**
   * signAndSendProposal
   *
   * Builds the proposal data for submission to Moloch v3 and Snapshot and signs it (ERC712).
   *
   * @param {PrepareAndSignProposalDataParam}
   * @param {adapterName} ContractAdapterNames - An adapter's contract address this data is related to.
   *   @note Does not accept voting adapter names.
   * @returns {Promise<SignAndSendProposalReturn>} An object with the proposal data, signature string, and propsal hash(es) from snapshot-hub.
   */
  async function signAndSendProposal<
    T extends SnapshotSubmitProposalReturn | SnapshotSubmitBaseReturn
  >(
    partialProposalData: PrepareAndSignProposalDataParam,
    adapterName: ContractAdapterNames,
    type: SnapshotType
  ): Promise<SignAndSendProposalReturn> {
    try {
      if (!account) {
        throw new Error('No account was found to send.');
      }

      if (!web3Instance) {
        throw new Error('No Web3 instance was found.');
      }

      if (!daoRegistryAddress) {
        throw new Error('No "DaoRegistry" address was found.');
      }

      if (!SNAPSHOT_HUB_API_URL) {
        throw new Error('No "SNAPSHOT_HUB_API_URL" was found.');
      }

      if (type === SnapshotType.vote) {
        throw new Error('Handling for type "vote" is not implemented.');
      }

      setProposalSignAndSendStatus(Web3TxStatus.AWAITING_CONFIRM);

      const adapterAddress = getAdapterAddressFromContracts(
        adapterName,
        contracts
      );
      const {body, name, metadata, timestamp} = partialProposalData;

      const {data: snapshotSpace} = await getSpace(SNAPSHOT_HUB_API_URL, SPACE);

      const commonData: SnapshotMessageBase = {
        name,
        body,
        metadata,
        token: snapshotSpace.token,
        space: SPACE,
        actionId: adapterAddress,
        chainId: DEFAULT_CHAIN,
        verifyingContract: daoRegistryAddress,
      };

      // 1. Check proposal type and prepare appropriate message
      const message =
        type === 'draft'
          ? await buildDraftMessage(commonData, SNAPSHOT_HUB_API_URL)
          : await buildProposalMessageHelper({
              ...commonData,
              timestamp,
            });

      const {domain, types} = getDomainDefinition(
        message,
        daoRegistryAddress,
        adapterAddress,
        DEFAULT_CHAIN
      );

      const dataToSign = JSON.stringify({
        types: types,
        domain: domain,
        primaryType: PRIMARY_TYPE_ERC712,
        message: message,
      });

      setProposalSignAndSendStatus(Web3TxStatus.AWAITING_CONFIRM);

      // 2. Sign data
      const signature = await signMessage(provider, account, dataToSign);

      setProposalSignAndSendStatus(Web3TxStatus.PENDING);

      // 3. Send data to snapshot-hub
      const {data} = await submitMessage<{
        uniqueId: string;
        uniqueIdDraft?: string;
      }>(SNAPSHOT_HUB_API_URL, account, message, signature);

      setProposalSignAndSendStatus(Web3TxStatus.FULFILLED);
      setProposalData({
        data: message,
        signature,
        uniqueId: data.uniqueId,
        uniqueIdDraft: data.uniqueIdDraft || '',
      });

      return {
        data: message,
        signature,
        uniqueId: data.uniqueId,
        uniqueIdDraft: data.uniqueIdDraft || '',
      };
    } catch (error) {
      setProposalSignAndSendStatus(Web3TxStatus.REJECTED);
      setProposalSignAndSendError(error);

      throw error;
    }
  }

  return {
    proposalData,
    proposalSignAndSendError,
    proposalSignAndSendStatus,
    signAndSendProposal,
  };
}
