// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.2 <0.9.0;

contract DePass {
    struct Credential {
        bytes32 id; // Unique ID for the credential
        string encryptedData; // Stores credentials as encrypted JSON
    }

    struct Vault {
        bytes32 id; // Unique vault ID (256 bits)
        string name;
        Credential[] credentials;
        address[] sharedWith; // List of addresses with whom the vault is shared
        mapping(address => string) encryptedKeys; // Symmetric key encrypted with each user's public key
    }

    mapping(address => Vault[]) private userVaults;
    mapping(address => Vault[]) private sharedVaults;

    event CredentialAdded(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event CredentialModified(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event VaultShared(address indexed owner, address indexed sharedWith, bytes32 vaultId);
    event VaultUnshared(address indexed owner, address indexed unsharedWith, bytes32 vaultId);
    event VaultCreated(address indexed user, bytes32 vaultId, string vaultName);
    event VaultDeleted(address indexed user, bytes32 vaultId);

    function createVault(
        bytes32 _vaultId,
        string memory _vaultName,
        string memory _encryptedSymmetricKey
    ) public {
        require(bytes(_vaultName).length > 0, "Vault name cannot be empty");

        // Create a new vault and add it to the user's vault list
        Vault storage newVault = userVaults[msg.sender].push();
        newVault.id = _vaultId;
        newVault.name = _vaultName;

        // Store the symmetric key encrypted for the creator
        newVault.encryptedKeys[msg.sender] = _encryptedSymmetricKey;

        emit VaultCreated(msg.sender, _vaultId, _vaultName);
    }

    function addCredential(bytes32 _vaultId, bytes32 _credentialId, string memory _encryptedData) public {
        require(_credentialId != bytes32(0), "Credential ID cannot be empty");

        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(userVault.id != bytes32(0), "Vault not found");

        userVault.credentials.push(Credential({
            id: _credentialId,
            encryptedData: _encryptedData
        }));

        emit CredentialAdded(msg.sender, _vaultId, _credentialId);
    }

    function modifyCredential(bytes32 _vaultId, bytes32 _credentialId, string memory _newEncryptedData) public {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(userVault.id != bytes32(0), "Vault not found");

        bool credentialFound = false;
        for (uint i = 0; i < userVault.credentials.length; i++) {
            if (userVault.credentials[i].id == _credentialId) {
                userVault.credentials[i].encryptedData = _newEncryptedData;
                credentialFound = true;
                break;
            }
        }

        require(credentialFound, "Credential not found");
        emit CredentialModified(msg.sender, _vaultId, _credentialId);
    }

    function shareVault(
        bytes32 _vaultId,
        address _userToShareWith,
        string memory _encryptedSymmetricKey
    ) public {
        Vault[] storage vaults = userVaults[msg.sender];
        bool vaultFound = false;

        for (uint i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                vaults[i].encryptedKeys[_userToShareWith] = _encryptedSymmetricKey;
                vaults[i].sharedWith.push(_userToShareWith);

                // Add the vault to the shared vaults mapping for the user with whom it is shared
                sharedVaults[_userToShareWith].push(vaults[i]);

                vaultFound = true;
                break;
            }
        }

        require(vaultFound, "Vault not found");

        emit VaultShared(msg.sender, _userToShareWith, _vaultId);
    }

    function unshareVault(bytes32 _vaultId, address _userToUnshareWith) public {
        Vault[] storage vaults = userVaults[msg.sender];
        bool vaultFound = false;

        for (uint i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                // Remove the encrypted symmetric key for the user
                delete vaults[i].encryptedKeys[_userToUnshareWith];

                // Remove the user from the list of shared addresses
                for (uint j = 0; j < vaults[i].sharedWith.length; j++) {
                    if (vaults[i].sharedWith[j] == _userToUnshareWith) {
                        vaults[i].sharedWith[j] = vaults[i].sharedWith[vaults[i].sharedWith.length - 1];
                        vaults[i].sharedWith.pop();
                        break;
                    }
                }

                // Remove the vault from the shared vaults list of the user it was unshared from
                Vault[] storage sharedUserVaults = sharedVaults[_userToUnshareWith];
                for (uint k = 0; k < sharedUserVaults.length; k++) {
                    if (sharedUserVaults[k].id == _vaultId) {
                        sharedUserVaults[k] = sharedUserVaults[sharedUserVaults.length - 1];
                        sharedUserVaults.pop();
                        break;
                    }
                }

                vaultFound = true;
                break;
            }
        }

        require(vaultFound, "Vault not found");

        emit VaultUnshared(msg.sender, _userToUnshareWith, _vaultId);
    }

    function deleteVault(bytes32 _vaultId) public {
        Vault[] storage vaults = userVaults[msg.sender];
        bool vaultDeleted = false;

        for (uint i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                // Remove the vault by moving the last element to the position of the vault to delete and reducing the array size
                vaults[i] = vaults[vaults.length - 1];
                vaults.pop();
                vaultDeleted = true;
                break;
            }
        }

        require(vaultDeleted, "Vault not found or deletion failed");

        emit VaultDeleted(msg.sender, _vaultId);
    }

    function getVaults() public view returns (Vault[] memory) {
        return userVaults[msg.sender];
    }

    function getSharedVaults() public view returns (Vault[] memory) {
        return sharedVaults[msg.sender];
    }

    function _getVaultById(address _user, bytes32 _vaultId) internal view returns (Vault storage) {
        Vault[] storage vaults = userVaults[_user];
        for (uint i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                return vaults[i];
            }
        }
        revert("Vault not found");
    }
}
