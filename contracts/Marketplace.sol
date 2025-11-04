// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IUserRegistry {
    function isSellerRegistered(address seller) external view returns (bool);
}

contract Marketplace is Ownable {
    struct Listing {
        uint256 id;
        address seller;
        address nft;
        uint256 tokenId;
        uint256 price;
        address paymentToken;
        bool active;
        bool sold;
    }

    struct PendingSale {
        uint256 id;
        address buyer;
        uint256 listingId;
        uint256 amount;
        bool released;
        bool refunded;
    }

    event SaleListed(uint256 indexed listingId, address indexed seller, address nft, uint256 tokenId, uint256 price, address paymentToken);
    event SaleCompleted(uint256 indexed saleId, address indexed buyer, uint256 amount);
    event ThirdPartyConfirmed(uint256 indexed saleId, bool verified);

    uint256 private _nextListingId = 1;
    uint256 private _nextSaleId = 1;

    IUserRegistry public registry;
    address public verifier; // trusted third-party account allowed to confirm delivery

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => PendingSale) public sales;

    constructor(address registry_, address verifier_) Ownable(msg.sender) {
        registry = IUserRegistry(registry_);
        verifier = verifier_;
    }

    function setVerifier(address verifier_) external onlyOwner {
        verifier = verifier_;
    }

    function listForSale(uint256 tokenId, uint256 price, address nft, address paymentToken) external returns (uint256) {
        require(registry.isSellerRegistered(msg.sender), "seller not registered");
        IERC721(nft).transferFrom(msg.sender, address(this), tokenId);
        uint256 id = _nextListingId++;
        listings[id] = Listing({
            id: id,
            seller: msg.sender,
            nft: nft,
            tokenId: tokenId,
            price: price,
            paymentToken: paymentToken,
            active: true,
            sold: false
        });
        emit SaleListed(id, msg.sender, nft, tokenId, price, paymentToken);
        return id;
    }

    function buyNow(uint256 listingId) external returns (uint256 saleId) {
        Listing storage l = listings[listingId];
        require(l.active && !l.sold, "not for sale");
        IERC20(l.paymentToken).transferFrom(msg.sender, address(this), l.price);
        // escrow payment until third-party confirms
        saleId = _nextSaleId++;
        sales[saleId] = PendingSale({
            id: saleId,
            buyer: msg.sender,
            listingId: listingId,
            amount: l.price,
            released: false,
            refunded: false
        });
        l.sold = true;
        l.active = false;
        emit SaleCompleted(saleId, msg.sender, l.price);
    }

    function thirdPartyConfirmDelivery(uint256 saleId, bool verified) external {
        require(msg.sender == verifier, "not verifier");
        PendingSale storage s = sales[saleId];
        require(!s.released && !s.refunded, "done");
        Listing storage l = listings[s.listingId];
        if (verified) {
            IERC20(l.paymentToken).transfer(l.seller, s.amount);
            IERC721(l.nft).transferFrom(address(this), s.buyer, l.tokenId);
            s.released = true;
        } else {
            IERC20(l.paymentToken).transfer(s.buyer, s.amount);
            // return NFT to seller
            IERC721(l.nft).transferFrom(address(this), l.seller, l.tokenId);
            s.refunded = true;
        }
        emit ThirdPartyConfirmed(saleId, verified);
    }
}

