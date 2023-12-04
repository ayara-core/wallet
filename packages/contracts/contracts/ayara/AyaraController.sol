// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../lib/Structs.sol";

import "./AyaraGasBank.sol";
import "./AyaraMessageHandler.sol";
import "./AyaraWalletManager.sol";
import "./AyaraWalletInstance.sol";

contract AyaraController is
    AyaraGasBank,
    AyaraMessageHandler,
    AyaraWalletManager
{
    error OperationFailed();

    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;
    uint256 public immutable chainId;

    event OperationExecuted(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint256 value,
        bytes data,
        bytes signature
    );

    event OperationExecutionSent(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint64 destinationChainId,
        bytes data,
        bytes signature
    );

    constructor(
        address initialOwner_,
        bytes32 salt_,
        uint256 chainId_,
        address[] memory gasTokens_,
        address link_,
        address router_
    )
        AyaraMessageHandler(link_, router_)
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
        // Retrieve wallet address
        address wallet = wallets[owner_];

        // Validate if wallet exists
        if (wallet == address(0)) {
            _createWallet(owner_, chainId, salt);
        }

        // Add funds to wallet
        _transferAndFundWallet(owner_, token_, amount_);
    }

    function executeUserOperation(
        address owner_,
        address wallet_,
        FeeData memory feeData_,
        Transaction memory transaction_
    ) external payable {
        // Retrieve wallet address
        address recordedWallet = wallets[owner_];
        address wallet = wallet_;
        if (wallet != recordedWallet || wallet == address(0)) {
            wallet = _createWallet(owner_, chainId, salt);
        }

        // Check if operation is being executed on the same chain
        if (transaction_.destinationChainId == chainId) {
            _executeUserOperationThisChain(
                owner_,
                wallet,
                feeData_,
                transaction_
            );
        } else {
            _executeUserOperationOtherChain(
                owner_,
                wallet_,
                feeData_,
                transaction_
            );
        }
    }

    function _executeUserOperationThisChain(
        address owner_,
        address wallet_,
        FeeData memory feeData_,
        Transaction memory transaction_
    ) internal {
        // Perform operation
        (bool success, ) = AyaraWalletInstance(payable(wallet_)).execute(
            transaction_.to,
            transaction_.value,
            transaction_.data,
            transaction_.signature
        );

        // Validate if operation was successful
        if (!success) revert OperationFailed();

        // Validate if fee is required
        if (feeData_.amount > 0) _chargeFee(owner_, feeData_);

        // Emit event
        emit OperationExecuted(
            owner_,
            wallet_,
            transaction_.to,
            transaction_.value,
            transaction_.data,
            transaction_.signature
        );
    }

    function _executeUserOperationOtherChain(
        address owner_,
        address wallet_,
        FeeData memory feeData_,
        Transaction memory transaction_
    ) internal {
        // Validate if fee is required
        if (feeData_.amount > 0) _chargeFee(owner_, feeData_);

        // Define and set allowance for destination chain
        // TODO

        // Send exection via AyaraMessenger to the other chain
        _routeMessage(
            owner_,
            wallet_,
            transaction_.destinationChainId,
            transaction_.to,
            transaction_.data,
            transaction_.signature
        );

        // Emit event
        emit OperationExecutionSent(
            owner_,
            wallet_,
            transaction_.to,
            transaction_.destinationChainId,
            transaction_.data,
            transaction_.signature
        );
    }

    function _ccipReceive(
        Client.Any2EVMMessage memory message
    ) internal override {
        // AyaraReceiver._ccipReceive(message);

        // struct Message {
        //     address owner
        //     address wallet;
        //     address to;
        //     bytes data;
        //     bytes signature;
        // }

        // Decode message
        Message memory decodedMessage = abi.decode(message.data, (Message));

        address recordedWallet = wallets[decodedMessage.owner];
        if (
            decodedMessage.wallet != recordedWallet ||
            decodedMessage.wallet == address(0)
        ) recordedWallet = _createWallet(decodedMessage.owner, chainId, salt);

        // Check if operation is being executed on the same chain

        Transaction memory transaction = Transaction({
            destinationChainId: 0,
            to: decodedMessage.to,
            value: 0,
            data: decodedMessage.data,
            signature: decodedMessage.signature
        });

        FeeData memory feeData = FeeData({token: address(0), amount: 0});

        _executeUserOperationThisChain(
            decodedMessage.owner,
            recordedWallet,
            feeData,
            transaction
        );
    }
}
