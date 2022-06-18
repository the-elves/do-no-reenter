// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Question {
    mapping(address => uint256) credit;

    function withdraw() public {
        address snd = msg.sender;
        uint i = 10;
        do{
            snd.call("");
            i--;
        } while(i>0);
    }
}
