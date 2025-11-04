// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract FAKEBTC is ERC20, Ownable {
    constructor() ERC20("Fake Bitcoin", "FAKEBTC") Ownable(msg.sender) {}

    function faucet(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

