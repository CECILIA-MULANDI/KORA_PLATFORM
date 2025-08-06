// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract InsuranceCompanies {
    // Map unique string ID to a boolean indicating registration
    mapping(string => bool) public isInsurerRegistered;
    mapping(string => bool) public isDeviceRegistered;
    mapping(string => string) public deviceToPolicy;
    address public owner;
    string[] public insurerIds;

    event InsurerRegistered(string indexed _insurerId);
    event DeviceRegistered(string indexed _deviceId, string indexed _policyId);

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

    function registerIoTDevice(
        string calldata _deviceId,
        string calldata _policyId
    ) public onlyOwner {
        require(!isDeviceRegistered[_deviceId], "Device already registered");
        isDeviceRegistered[_deviceId] = true;
        deviceToPolicy[_deviceId] = _policyId;
        emit DeviceRegistered(_deviceId, _policyId);
    }

    function getAllInsurerIds() public view returns (string[] memory) {
        return insurerIds;
    }
}
