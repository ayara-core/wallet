// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract AyaraWalletInstance {
    error InvalidZeroAddress();
    error InsufficientBalance(uint256 balance, uint256 value);
    error ExecutionFailed(bytes data);
    error OwnableUnauthorizedAccount(address account);
    error InvalidSignature();

    uint256 public constant VERSION = 1;

    address public immutable addressOwner;
    address public immutable controller;
    uint256 public nonce;

    receive() external payable {}

    constructor(address addressOwner_, address controller_) {
        addressOwner = addressOwner_;
        controller = controller_;
        nonce = 0;
    }

    modifier onlyOwnerOrValidSignature(
        bytes memory signature,
        bytes memory data
    ) {
        if (msg.sender == addressOwner) {
            _;
        } else {
            // TODO: ADD CHAIN ID!
            bytes32 hash = MessageHashUtils.toEthSignedMessageHash(
                keccak256(
                    abi.encodePacked(addressOwner, controller, nonce, data)
                )
            );

            if (
                !SignatureChecker.isValidSignatureNow(
                    addressOwner,
                    hash,
                    signature
                )
            ) {
                revert InvalidSignature();
            }

            _;
        }
    }

    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signature
    )
        external
        payable
        onlyOwnerOrValidSignature(signature, data)
        returns (bool, bytes memory)
    {
        if (address(this).balance < value) {
            revert InsufficientBalance(uint256(address(this).balance), value);
        }
        return _execute(to, value, data);
    }

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
