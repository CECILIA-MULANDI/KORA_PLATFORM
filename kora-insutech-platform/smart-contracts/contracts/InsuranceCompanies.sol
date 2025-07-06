// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract InsuranceCompanies {
    //UUID from insurance company to their wallet address
    mapping(string => address) public koraIdToInsurerAddress;
    //
    mapping(address => string) public insurerAddressToKoraId;
    mapping(address => bool) public isInsurerRegistered;
    address public owner;
    string[] public insurerIds;

    event InsurerRegistered(
        string indexed _insurerId,
        address indexed _insurerWalletAddress
    );

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function registerInsuranceCompany(
        string calldata _insurerId,
        address _insurerWalletAddress
    ) public onlyOwner {
        require(
            koraIdToInsurerAddress[_insurerId] == address(0),
            "Insurance company already registered"
        );
        // Compare the hash of the stored string with the hash of an empty string
        require(
            keccak256(bytes(insurerAddressToKoraId[_insurerWalletAddress])) ==
                keccak256(bytes("")),
            "Insurer address has already been registered!"
        );
        require(_insurerWalletAddress != address(0), "Invalid wallet address");
        koraIdToInsurerAddress[_insurerId] = _insurerWalletAddress;
        insurerAddressToKoraId[_insurerWalletAddress] = _insurerId;
        isInsurerRegistered[_insurerWalletAddress] = true;
        insurerIds.push(_insurerId);
        emit InsurerRegistered(_insurerId, _insurerWalletAddress);
    }

    function checkInsurerByKoraId(
        string calldata _koraInsurerId
    ) public view returns (bool, address) {
        address walletAddr = koraIdToInsurerAddress[_koraInsurerId];
        return (walletAddr != address(0), walletAddr);
    }

    function checkInsurerByWalletAddress(
        address _insurerWalletAddress
    ) public view returns (bool, string memory) {
        string memory koraId = insurerAddressToKoraId[_insurerWalletAddress];
        return (isInsurerRegistered[_insurerWalletAddress], koraId);
    }
}
