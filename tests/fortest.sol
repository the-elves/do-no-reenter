// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Question {
    mapping(address => uint256) credit;

    function withdraw(uint256 amount) public {
        bool success;
        bytes memory data;
        for(success = true; !success; success=!success) {
            (success, data) = msg.sender.call{value: amount}("");
            require(success);
            credit[msg.sender] -= amount;
        }
    }
}
