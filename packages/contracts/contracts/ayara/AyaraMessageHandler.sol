// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AyaraReceiver.sol";
import "./AyaraSender.sol";

import "../lib/Structs.sol";

contract AyaraMessageHandler is AyaraSender, AyaraReceiver {
    mapping(uint64 => uint64) public chainIdToChainSelector;

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

    function _routeMessage(
        address owner_,
        address wallet,
        Transaction memory transaction_,
        address token_,
        uint256 lockedAmount_
    ) internal {
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

        _sendMessage(destinationChainSelector, data);
    }
}
