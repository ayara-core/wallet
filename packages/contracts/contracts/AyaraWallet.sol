// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract AyaraWallet is TransparentUpgradeableProxy, Initializable {
    error InvalidZeroAddress();

    address public walletOwner;
    address public controller;
    uint256 public nonce;

    receive() external payable {}

    constructor(
        address walletOwner_,
        address controller_,
        address logic_
    ) TransparentUpgradeableProxy(logic_, controller_, "") {
        walletOwner = walletOwner_;
        controller = controller_;
        nonce = 0;
    }

    function initialize(
        address owner_,
        address controller_
    ) external initializer {
        if (owner_ == address(0) || controller_ == address(0)) {
            revert InvalidZeroAddress();
        }

        walletOwner = owner_;
        controller = controller_;

        nonce = 0;
    }
}
