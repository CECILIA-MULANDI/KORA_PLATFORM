// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InsuranceCompanies {
    // Map unique string ID to a boolean indicating registration
    mapping(string => bool) public isInsurerRegistered;
    address public owner;
    string[] public insurerIds;

    event InsurerRegistered(string indexed _insurerId);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function registerInsuranceCompany(
        string calldata _insurerId
    ) public onlyOwner {
        require(
            !isInsurerRegistered[_insurerId],
            "Insurance company already registered"
        );
        isInsurerRegistered[_insurerId] = true;
        insurerIds.push(_insurerId);
        emit InsurerRegistered(_insurerId);
    }

    function checkInsurerByKoraId(
        string calldata _koraInsurerId
    ) public view returns (bool) {
        return isInsurerRegistered[_koraInsurerId];
    }

    function getAllInsurerIds() public view returns (string[] memory) {
        return insurerIds;
    }
}
