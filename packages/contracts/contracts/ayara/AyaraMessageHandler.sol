// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AyaraReceiver.sol";
import "./AyaraSender.sol";

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
        uint64 destinationChainId,
        address to_,
        bytes memory data_,
        bytes memory signature_
    ) internal {
        // Prepare message
        // Prepare data
        bytes memory data = abi.encode(
            Message({
                owner: owner_,
                wallet: wallet,
                to: to_,
                data: data_,
                signature: signature_
            })
        );

        // Convert chainId to chainSelector
        uint64 destinationChainSelector = chainIdToChainSelector[
            destinationChainId
        ];

        _sendMessage(destinationChainSelector, data);
    }
}
