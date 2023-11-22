// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";

import "./AyaraWallet.sol";
import "./lib/Create2Factory.sol";

contract AyaraController is Create2Factory, ProxyAdmin {
    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;

    constructor(address _proxyAdmin, uint256 _salt) ProxyAdmin(_proxyAdmin) {
        salt = bytes32(_salt);
    }

    function createWallet(
        address owner,
        bytes[] calldata callbacks
    ) external returns (address) {
        bytes memory bytecode = type(AyaraWallet).creationCode;
        address deployedAddress = _deploy(0, salt, bytecode, callbacks);

        // Initialize the wallet and set the owner
        AyaraWallet(payable(deployedAddress)).initialize(owner, address(this));

        return deployedAddress;
    }
}
