// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract UserRegistry is Ownable {
    struct SellerProfile {
        string phone;
        string physicalAddress;
        bool registered;
    }

    mapping(address => SellerProfile) private _sellers;
    event SellerRegistered(address indexed seller, string phone, string physicalAddress);

    constructor() Ownable(msg.sender) {}

    function registerSeller(string calldata phone, string calldata physicalAddress) external {
        _sellers[msg.sender] = SellerProfile({phone: phone, physicalAddress: physicalAddress, registered: true});
        emit SellerRegistered(msg.sender, phone, physicalAddress);
    }

    function isSellerRegistered(address seller) external view returns (bool) {
        return _sellers[seller].registered;
    }

    function getSeller(address seller) external view returns (SellerProfile memory) {
        return _sellers[seller];
    }
}

