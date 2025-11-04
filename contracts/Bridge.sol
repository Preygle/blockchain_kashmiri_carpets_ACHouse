// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Bridge is Ownable {
    struct AuctionRecord {
        uint256 auctionId;
        address winner;
        address seller;
        uint256 amount;
        uint256 l2Block;
        bool recorded;
        bool verified;
        bool paidOut;
    }

    event AuctionFinalized(uint256 auctionId, address winner, address seller, uint256 amount, uint256 l2Block);

    address public paymentToken; // FAKEBTC on L1
    address public marketplace;  // optional: notify marketplace
    address public verifier;     // third-party trusted account

    mapping(uint256 => AuctionRecord) public auctions;

    constructor(address paymentToken_, address verifier_) Ownable(msg.sender) {
        paymentToken = paymentToken_;
        verifier = verifier_;
    }

    function setMarketplace(address marketplace_) external onlyOwner {
        marketplace = marketplace_;
    }

    // demo: accept plain json bytes with details (no proofs)
    function submitAuctionResult(bytes calldata l2Payload) external {
        (
            uint256 auctionId,
            address winner,
            address seller,
            uint256 amount,
            uint256 l2Block
        ) = abi.decode(l2Payload, (uint256, address, address, uint256, uint256));
        AuctionRecord storage r = auctions[auctionId];
        require(!r.recorded, "exists");
        auctions[auctionId] = AuctionRecord({
            auctionId: auctionId,
            winner: winner,
            seller: seller,
            amount: amount,
            l2Block: l2Block,
            recorded: true,
            verified: false,
            paidOut: false
        });
        emit AuctionFinalized(auctionId, winner, seller, amount, l2Block);
    }

    function thirdPartyConfirmAuction(uint256 auctionId, bool verified) external {
        require(msg.sender == verifier, "not verifier");
        AuctionRecord storage r = auctions[auctionId];
        require(r.recorded && !r.paidOut, "bad state");
        r.verified = verified;
    }

    function finalizeToSeller(uint256 auctionId) external {
        AuctionRecord storage r = auctions[auctionId];
        require(r.recorded && r.verified && !r.paidOut, "not ready");
        IERC20(paymentToken).transfer(r.seller, r.amount);
        r.paidOut = true;
    }
}

