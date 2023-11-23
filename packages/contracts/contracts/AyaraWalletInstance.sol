// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AyaraWalletInstance is Ownable {
    error InvalidZeroAddress();
    error InsufficientBalance(uint256 balance, uint256 value);
    error ExecutionFailed(bytes data);

    uint256 public constant VERSION = 1;

    address public immutable addressOwner;
    address public immutable controller;
    uint256 public nonce;

    receive() external payable {}

    constructor(
        address addressOwner_,
        address controller_
    ) Ownable(addressOwner_) {
        addressOwner = addressOwner_;
        controller = controller_;
        nonce = 0;
    }

    function execute(
        address to,
        uint256 value,
        bytes calldata data
    ) external payable onlyOwner returns (bool, bytes memory) {
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
