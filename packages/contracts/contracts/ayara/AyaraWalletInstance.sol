// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/SignatureValidator.sol";

import "hardhat/console.sol";

/**
 * @title AyaraWalletInstance
 * @dev This contract is a wallet instance that supports execution of arbitrary calls.
 */
contract AyaraWalletInstance {
    error InvalidZeroAddress();
    error InsufficientBalance(uint256 balance, uint256 value);
    error ExecutionFailed(bytes data);
    error OwnableUnauthorizedAccount(address account);
    error InvalidSignature();
    error InvalidNonce(uint256 givenNonce, uint256 expectedNonce);

    uint256 public constant VERSION = 1;

    address public immutable ownerAddress;
    address public immutable controllerAddress;
    uint256 public immutable chainId;
    uint256 public nonce;

    receive() external payable {}

    /**
     * @dev Initializes the contract setting the owner and controller addresses.
     */
    constructor(
        address ownerAddress_,
        address controllerAddress_,
        uint256 chainId_
    ) {
        ownerAddress = ownerAddress_;
        controllerAddress = controllerAddress_;
        chainId = chainId_;
        nonce = 0;
    }

    /**
     * @dev Modifier that checks if the sender is the owner or has a valid signature.
     */
    modifier onlyOwnerOrValidSignature(
        bytes memory data,
        bytes memory signature
    ) {
        if (msg.sender == ownerAddress) {
            _;
        } else {
            SignatureValidator.validateSignature(
                data,
                signature,
                chainId,
                ownerAddress,
                controllerAddress,
                nonce
            );
            _;
        }
    }

    /**
     * @dev Executes an arbitrary call.
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signature
    )
        external
        payable
        onlyOwnerOrValidSignature(data, signature)
        returns (bool, bytes memory)
    {
        // Check that the contract has enough balance to execute the call
        if (address(this).balance < value) {
            revert InsufficientBalance(uint256(address(this).balance), value);
        }

        return _execute(to, value, data);
    }

    /**
     * @dev Internal function to execute a call.
     */
    function _execute(
        address to,
        uint256 value,
        bytes calldata data
    ) private returns (bool, bytes memory) {
        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) {
            revert ExecutionFailed(data);
        }

        nonce++;

        return (success, result);
    }
}
