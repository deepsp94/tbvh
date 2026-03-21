// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TBVHEscrow is EIP712, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public token;
    address public teeSigner;

    struct Deposit {
        address buyer;
        uint256 amount;
        uint256 depositedAt;
        bool settled;
    }

    mapping(bytes32 => Deposit) public deposits;

    uint256 public constant REFUND_TIMEOUT = 7 days;

    bytes32 public constant OUTCOME_TYPEHASH = keccak256(
        "NegotiationOutcome(bytes32 instanceId,address buyer,address seller,string outcome,uint256 finalPrice,uint256 timestamp)"
    );

    event Deposited(bytes32 indexed instanceId, address indexed buyer, uint256 amount);
    event Released(bytes32 indexed instanceId, address indexed seller, uint256 finalPrice);
    event Refunded(bytes32 indexed instanceId, address indexed buyer, uint256 amount);

    constructor(address _token, address _teeSigner) EIP712("TBVH", "1") Ownable(msg.sender) {
        token = IERC20(_token);
        teeSigner = _teeSigner;
    }

    function deposit(bytes32 instanceId, uint256 amount) external {
        require(deposits[instanceId].buyer == address(0), "Already deposited");
        require(amount > 0, "Amount must be positive");

        token.safeTransferFrom(msg.sender, address(this), amount);
        deposits[instanceId] = Deposit({
            buyer: msg.sender,
            amount: amount,
            depositedAt: block.timestamp,
            settled: false
        });

        emit Deposited(instanceId, msg.sender, amount);
    }

    function release(
        bytes32 instanceId,
        address seller,
        string calldata outcome,
        uint256 finalPrice,
        uint256 timestamp,
        bytes calldata signature
    ) external {
        Deposit storage dep = deposits[instanceId];
        require(dep.buyer != address(0), "No deposit");
        require(!dep.settled, "Already settled");
        require(keccak256(bytes(outcome)) == keccak256(bytes("ACCEPT")), "Outcome must be ACCEPT");
        require(finalPrice <= dep.amount, "Price exceeds deposit");

        bytes32 structHash = keccak256(abi.encode(
            OUTCOME_TYPEHASH,
            instanceId,
            dep.buyer,
            seller,
            keccak256(bytes(outcome)),
            finalPrice,
            timestamp
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == teeSigner, "Invalid signer");

        dep.settled = true;

        if (finalPrice > 0) {
            token.safeTransfer(seller, finalPrice);
        }
        uint256 excess = dep.amount - finalPrice;
        if (excess > 0) {
            token.safeTransfer(dep.buyer, excess);
        }

        emit Released(instanceId, seller, finalPrice);
    }

    function refund(bytes32 instanceId) external {
        Deposit storage dep = deposits[instanceId];
        require(dep.buyer != address(0), "No deposit");
        require(!dep.settled, "Already settled");
        require(msg.sender == dep.buyer, "Only buyer can refund");
        require(block.timestamp >= dep.depositedAt + REFUND_TIMEOUT, "Timeout not reached");

        dep.settled = true;
        token.safeTransfer(dep.buyer, dep.amount);

        emit Refunded(instanceId, dep.buyer, dep.amount);
    }

    function refundWithSignature(
        bytes32 instanceId,
        address seller,
        string calldata outcome,
        uint256 finalPrice,
        uint256 timestamp,
        bytes calldata signature
    ) external {
        Deposit storage dep = deposits[instanceId];
        require(dep.buyer != address(0), "No deposit");
        require(!dep.settled, "Already settled");
        require(keccak256(bytes(outcome)) == keccak256(bytes("REJECT")), "Outcome must be REJECT");

        bytes32 structHash = keccak256(abi.encode(
            OUTCOME_TYPEHASH,
            instanceId,
            dep.buyer,
            seller,
            keccak256(bytes(outcome)),
            finalPrice,
            timestamp
        ));
        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == teeSigner, "Invalid signer");

        dep.settled = true;
        token.safeTransfer(dep.buyer, dep.amount);

        emit Refunded(instanceId, dep.buyer, dep.amount);
    }

    function setTeeSigner(address _teeSigner) external onlyOwner {
        teeSigner = _teeSigner;
    }

    function setToken(address _token) external onlyOwner {
        token = IERC20(_token);
    }
}
