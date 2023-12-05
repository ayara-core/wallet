// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/Structs.sol";

import "./AyaraGasBank.sol";
import "./AyaraWalletManager.sol";
import "./AyaraWalletInstance.sol";

import "hardhat/console.sol";

contract AyaraController is AyaraGasBank, AyaraWalletManager {
    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;
    uint256 public immutable chainId;

    error InvalidWallet(address wallet, address expectedWallet);

    constructor(
        address initialOwner_,
        bytes32 salt_,
        uint256 chainId_,
        address[] memory gasTokens_,
        address router_,
        address link_
    )
        AyaraWalletManager(router_, link_)
        AyaraGasBank(gasTokens_, initialOwner_)
    {
        salt = salt_;
        chainId = chainId_;
    }

    // Redirect functions to AyaraWalletManager
    function calculateWalletAddress(
        address owner_
    ) external view returns (address) {
        return _calculateWalletAddress(owner_, chainId, salt);
    }

    function createWallet(
        address owner_,
        bytes[] calldata callbacks_
    ) external returns (address) {
        return _createWallet(owner_, callbacks_, chainId, salt);
    }

    // Redirect functions to AyaraGasBank
    function addFundsToWallet(
        address owner_,
        address token_,
        uint256 amount_
    ) public payable {
        // Create wallet if not exists
        _createWalletIfNotExists(owner_, chainId, salt);

        // Add funds to wallet
        _transferAndFundWallet(owner_, token_, amount_);
    }

    function executeUserOperation(
        address owner_,
        address wallet_,
        FeeData memory feeData_,
        Transaction memory transaction_
    ) external payable {
        // Create wallet if not exists\
        address wallet = _createWalletIfNotExists(owner_, chainId, salt);
        if (wallet != wallet_) revert InvalidWallet(wallet, wallet_);

        _chargeFeeIfRequired(owner_, feeData_);

        if (transaction_.destinationChainId == chainId) {
            _executeUserOperationThisChain(owner_, wallet_, transaction_);
        } else {
            uint256 lockedAmount = _lockGas(owner_, feeData_.token);
            _executeUserOperationOtherChain(
                owner_,
                wallet_,
                transaction_,
                feeData_.token,
                lockedAmount
            );
        }
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory ccipMessage
    ) internal override {
        Message memory message = _handleReceive(ccipMessage);

        address recordedWallet = wallets[message.owner];
        address createdWallet;
        if (recordedWallet == address(0))
            createdWallet = _createWalletIfNotExists(
                message.owner,
                chainId,
                salt
            );

        // Set allowance if required
        _setAllowance(message.owner, message.token, message.lockedAmount);

        Transaction memory transaction = Transaction({
            destinationChainId: 0,
            to: message.to,
            value: 0,
            data: message.data,
            signature: message.signature
        });

        // _setAllowanceIfRequired(
        //     message.owner,
        //     transaction.to,
        //     transaction.value,
        //     transaction.data
        // );

        _executeUserOperationThisChain(
            message.owner,
            createdWallet,
            transaction
        );
    }
}
