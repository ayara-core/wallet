// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

contract AyaraWalletInstance is Ownable {
    error InvalidZeroAddress();

    address public addressOwner;
    address public controller;
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
        bytes calldata data
    ) external payable onlyOwner returns (bool, bytes memory) {
        return _execute(to, data);
    }

    function _execute(
        address to,
        bytes calldata data
    ) private returns (bool, bytes memory) {
        (bool success, bytes memory result) = to.call{value: msg.value}(data);
        require(success, "!success");

        nonce++;

        return (success, result);
    }
}
