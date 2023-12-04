// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

import "./MessageStruct.sol";

contract AyaraSender {
    enum PayFeesIn {
        NATIVE,
        LINK
    }

    address public immutable router;
    address public immutable link;

    event MessageSent(bytes32 indexed messageId);

    constructor(address router_, address link_) {
        router = router_;
        link = link_;
    }

    function _sendMessage(
        uint64 destinationChainSelector,
        bytes memory data_
    ) internal {
        address receiver = address(this);
        // Should be the AyaraController,
        // same address because we use Create2

        // We pay fees in LINK, hardcoded for now
        PayFeesIn payFeesIn = PayFeesIn.LINK;

        Client.EVM2AnyMessage memory message = Client.EVM2AnyMessage({
            receiver: abi.encode(receiver),
            data: data_,
            tokenAmounts: new Client.EVMTokenAmount[](0),
            extraArgs: "",
            feeToken: payFeesIn == PayFeesIn.LINK ? link : address(0)
        });

        uint256 fee = IRouterClient(router).getFee(
            destinationChainSelector,
            message
        );

        bytes32 messageId;

        if (payFeesIn == PayFeesIn.LINK) {
            // LinkTokenInterface(i_link).approve(i_router, fee);
            messageId = IRouterClient(router).ccipSend(
                destinationChainSelector,
                message
            );
        } else {
            messageId = IRouterClient(router).ccipSend{value: fee}(
                destinationChainSelector,
                message
            );
        }

        emit MessageSent(messageId);
    }
}
