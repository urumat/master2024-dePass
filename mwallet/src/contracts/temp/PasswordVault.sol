// SPDX-License-Identifier: UNLICENSED
//Solidity Version
pragma solidity >=0.8.2 <0.9.0;

contract PasswordVault {
    struct Credential {
        string username;
        string password;
        string url;
    }

    struct Vault {
        string name;
        Credential[] credentials;
    }

    mapping(address => Vault) private vaults;

    event CredentialAdded(address indexed user, string username, string url);

    function addCredential(string memory _username, string memory _password, string memory _url) public {
        Credential memory newCredential = Credential({
            username: _username,
            password: _password,
            url: _url
        });

        vaults[msg.sender].credentials.push(newCredential);

        // If Vault does not have a name then 'Default' is assigned
        if (bytes(vaults[msg.sender].name).length == 0) {
            vaults[msg.sender].name = "Default";
        }

        emit CredentialAdded(msg.sender, _username, _url);
    }

    function getVaults() public view returns (Vault[] memory) {
        Vault[] memory userVault = new Vault[](1);
        userVault[0] = vaults[msg.sender];
        return userVault;
    }
}