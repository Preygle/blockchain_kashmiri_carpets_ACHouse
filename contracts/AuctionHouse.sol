// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IUserRegistryL2 {
    function isSellerRegistered(address seller) external view returns (bool);
}

contract AuctionHouse {
    struct Auction {
        uint256 id;
        address seller;
        address nft;
        uint256 tokenId;
        address paymentToken;
        uint256 minBid;
        uint256 endTime;
        address highestBidder;
        uint256 highestBid;
        bool ended;
    }

    event AuctionCreated(uint256 indexed auctionId, uint256 nftId, address seller, uint256 minBid, uint256 endTime);
    event BidPlaced(uint256 indexed auctionId, address bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, address seller, uint256 amount);

    uint256 private _nextId = 1;
    IUserRegistryL2 public registry;

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => uint256)) public bids; // refundable amounts

    constructor(address registry_) {
        registry = IUserRegistryL2(registry_);
    }

    function createAuction(
        uint256 tokenId,
        address nft,
        uint256 minBid,
        uint256 duration,
        address seller,
        address paymentToken
    ) external returns (uint256) {
        require(msg.sender == seller, "only seller");
        require(registry.isSellerRegistered(seller), "seller not reg");
        IERC721(nft).transferFrom(seller, address(this), tokenId);
        uint256 id = _nextId++;
        auctions[id] = Auction({
            id: id,
            seller: seller,
            nft: nft,
            tokenId: tokenId,
            paymentToken: paymentToken,
            minBid: minBid,
            endTime: block.timestamp + duration,
            highestBidder: address(0),
            highestBid: 0,
            ended: false
        });
        emit AuctionCreated(id, tokenId, seller, minBid, block.timestamp + duration);
        return id;
    }

    function placeBid(uint256 auctionId, uint256 amount) external {
        Auction storage a = auctions[auctionId];
        require(block.timestamp < a.endTime && !a.ended, "ended");
        uint256 minRequired = a.highestBid == 0 ? a.minBid : a.highestBid + 1; // 1 wei tick
        require(amount >= minRequired, "low bid");
        IERC20(a.paymentToken).transferFrom(msg.sender, address(this), amount);
        if (a.highestBidder != address(0)) {
            bids[auctionId][a.highestBidder] += a.highestBid;
        }
        a.highestBidder = msg.sender;
        a.highestBid = amount;
        emit BidPlaced(auctionId, msg.sender, amount);
    }

    function withdrawBid(uint256 auctionId) external {
        uint256 bal = bids[auctionId][msg.sender];
        require(bal > 0, "no funds");
        bids[auctionId][msg.sender] = 0;
        address paymentToken = auctions[auctionId].paymentToken;
        IERC20(paymentToken).transfer(msg.sender, bal);
    }

    function endAuction(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        require(!a.ended, "already");
        require(block.timestamp >= a.endTime, "not yet");
        a.ended = true;
        // lock result and keep funds in contract until bridged/verified on L1
        emit AuctionEnded(auctionId, a.highestBidder, a.seller, a.highestBid);
    }

    // for demo: allow admin to release funds/NFT back if no bids
    function reclaimIfNoBids(uint256 auctionId) external {
        Auction storage a = auctions[auctionId];
        require(a.ended, "not ended");
        require(a.highestBidder == address(0), "has winner");
        IERC721(a.nft).transferFrom(address(this), a.seller, a.tokenId);
    }
}

