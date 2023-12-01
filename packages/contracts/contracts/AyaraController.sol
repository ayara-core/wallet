// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./AyaraWalletInstance.sol";
import "./AyaraGasBank.sol";
import "./lib/Create2Factory.sol";

contract AyaraController is AyaraGasBank, Create2Factory, Ownable {
    error WalletAlreadyInitialized(address wallet);
    error WalletNotInitialized(address owner);
    error OperationFailed();

    uint256 public constant VERSION = 1;
    bytes32 public immutable salt;
    uint256 public immutable chainId;

    mapping(address => address) public wallets;

    event WalletCreated(address indexed owner, address indexed wallet);

    event OperationExecuted(
        address indexed owner,
        address indexed wallet,
        address indexed to,
        uint256 value,
        bytes data,
        bytes signature
    );

    constructor(
        address proxyAdmin_,
        uint256 salt_,
        address[] memory gasTokens_
    ) Ownable(proxyAdmin_) {
        salt = bytes32(salt_);
        chainId = block.chainid;

        // Initialize gas tokens
        _modifyGasTokens(gasTokens_, true);
    }

    function modifyGasTokens(
        address[] memory gasTokens_,
        bool enabled_
    ) external onlyOwner {
        _modifyGasTokens(gasTokens_, enabled_);
    }

    function createWallet(
        address owner_,
        bytes[] calldata callbacks_
    ) external returns (address) {
        // Validate if wallet already exists
        if (wallets[owner_] != address(0))
            revert WalletAlreadyInitialized(wallets[owner_]);

        // Create wallet
        return _createWallet(owner_, callbacks_);
    }

    function addFundsToWallet(
        address owner_,
        address token_,
        uint256 amount_
    ) public payable {
        // Retrieve wallet address
        address wallet = wallets[owner_];

        // Validate if wallet exists
        if (wallet == address(0)) {
            _createWallet(owner_);
        }

        // Add funds to wallet
        _transferAndFundWallet(owner_, token_, amount_);
    }

    function executeUserOperation(
        address owner_,
        address wallet_,
        address feeToken_,
        uint256 feeAmount_,
        address to_,
        uint256 value_,
        bytes calldata data_,
        bytes calldata signature_
    ) external payable {
        // Retrieve wallet address
        address recordedWallet = wallets[owner_];
        if (wallet_ != recordedWallet || wallet_ == address(0))
            _createWallet(owner_);

        // Perform operation
        (bool success, ) = AyaraWalletInstance(payable(wallet_)).execute(
            to_,
            value_,
            data_,
            signature_
        );

        // Validate if operation was successful
        if (!success) revert OperationFailed();

        // Validate if fee is required
        if (feeAmount_ > 0) _chargeFee(owner_, feeToken_, feeAmount_);

        // Emit event
        emit OperationExecuted(owner_, wallet_, to_, value_, data_, signature_);
    }

    function _createWallet(address owner_) internal returns (address) {
        return _createWallet(owner_, new bytes[](0));
    }

    function _createWallet(
        address owner_,
        bytes[] memory callbacks_
    ) internal returns (address) {
        // Generate bytecode
        bytes memory bytecode = type(AyaraWalletInstance).creationCode;
        bytes memory encodedArgs = abi.encode(owner_, address(this), chainId);
        bytes memory finalBytecode = abi.encodePacked(bytecode, encodedArgs);

        // Deploy contract
        address deployedAddress = deploy(0, salt, finalBytecode, callbacks_);

        // Store wallet address
        wallets[owner_] = deployedAddress;

        // Emit event
        emit WalletCreated(owner_, deployedAddress);

        return deployedAddress;
    }
}
