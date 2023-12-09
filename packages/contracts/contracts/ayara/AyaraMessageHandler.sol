// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AyaraReceiver.sol";
import "./AyaraSender.sol";

import "../lib/Structs.sol";

/**
 * @title AyaraMessageHandler
 * @dev This contract is responsible for handling messages in the Ayara protocol. It receives CCIP and sends CCIP messages.
 * The subcontracts AyaraSender and AyaraReceiver are responsible for sending and receiving CCIP messages, respectively.
 */
contract AyaraMessageHandler is AyaraSender, AyaraReceiver {
    mapping(uint64 => uint64) public chainIdToChainSelector;

    /**
     * @dev Constructor for the AyaraMessageHandler contract.
     * @param router_ The address of the router.
     * @param link_ The address of the link.
     * Here we initialize the chain selectors for the supported chains. We map the chainId to the chainSelector.
     * So that we can just use the chainId to send messages to the appropriate chain, and this contract will convert it to the chainSelector
     * used by chainlink ccip.
     */
    constructor(
        address router_,
        address link_
    ) AyaraReceiver(router_) AyaraSender(router_, link_) {
        // Initialize chain selectors
        // Sepolia
        chainIdToChainSelector[11155111] = 16015286601757825753;
        // Optimism Goerli
        chainIdToChainSelector[420] = 2664363617261496610;
        // Base Goerli
        chainIdToChainSelector[84531] = 5790810961207155433;
    }

    /**
     * @dev Routes a message to the appropriate chain.
     * @param owner_ The address of the owner.
     * @param wallet The address of the wallet.
     * @param transaction_ The transaction to be routed.
     * @param token_ The address of the token.
     * @param lockedAmount_ The amount of tokens to be locked.
     */
    function _routeMessage(
        address owner_,
        address wallet,
        Transaction memory transaction_,
        address token_,
        uint256 lockedAmount_
    ) internal returns (uint256) {
        // Prepare data
        bytes memory data = abi.encode(
            Message({
                owner: owner_,
                wallet: wallet,
                to: transaction_.to,
                data: transaction_.data,
                signature: transaction_.signature,
                token: token_,
                lockedAmount: lockedAmount_
            })
        );

        // Convert chainId to chainSelector
        uint64 destinationChainSelector = chainIdToChainSelector[
            transaction_.destinationChainId
        ];

        // Destination address is the same as this contract since we deployed
        // the AyaraReceiver contract on the other chain with the same address
        address destinationAddress = address(this);

        // Send message to destination chain, handled by AyaraReceiver
        return _sendMessage(destinationChainSelector, destinationAddress, data);
    }
}
