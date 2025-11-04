// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CarpetNFT is ERC721URIStorage, Ownable {
    uint256 private _nextId = 1;

    event Minted(uint256 indexed tokenId, address owner, string tokenURI);

    constructor() ERC721("Kashmiri Carpet", "CARPET") Ownable(msg.sender) {}

    function mint(address to, string calldata tokenURI_) external returns (uint256) {
        uint256 tokenId = _nextId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        emit Minted(tokenId, to, tokenURI_);
        return tokenId;
    }
}

