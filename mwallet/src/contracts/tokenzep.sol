// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DePassToken is ERC20 {
    constructor(uint256 _supply) ERC20 ("DePass Token", "DPT"){
        //_mint(msg.sender, _supply);
        _mint(msg.sender, _supply * 10 ** decimals());
    }
}