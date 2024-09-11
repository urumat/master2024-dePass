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
    }

    // Mapping to store the vaults created by each user
    mapping(address => Vault[]) private userVaults;
    
    // Mapping to track which vaults have been shared with a user
    mapping(address => Vault[]) private sharedVaults;

    // Mapping to store encrypted symmetric keys associated with each vault and user
    mapping(address => mapping(bytes32 => string)) private encryptedKeys;

    event CredentialAdded(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event CredentialModified(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event VaultShared(address indexed owner, address indexed sharedWith, bytes32 vaultId);
    event VaultUnshared(address indexed owner, address indexed unsharedWith, bytes32 vaultId);
    event VaultCreated(address indexed user, bytes32 vaultId, string vaultName);
    event VaultDeleted(address indexed user, bytes32 vaultId);

    function createVault(bytes32 _vaultId, string memory _vaultName, string memory _encryptedSymmetricKey) public {
        require(bytes(_vaultName).length > 0, "Vault name cannot be empty");

        Vault storage newVault = userVaults[msg.sender].push();
        newVault.id = _vaultId;
        newVault.name = _vaultName;

        encryptedKeys[msg.sender][_vaultId] = _encryptedSymmetricKey;

        emit VaultCreated(msg.sender, _vaultId, _vaultName);
    }

    function addCredential(bytes32 _vaultId, bytes32 _credentialId, string memory _encryptedData) public {
        require(_credentialId != bytes32(0), "Credential ID cannot be empty");

        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(userVault.id != bytes32(0), "Vault not found");

        userVault.credentials.push(Credential({id: _credentialId, encryptedData: _encryptedData}));

        emit CredentialAdded(msg.sender, _vaultId, _credentialId);
    }

    function modifyCredential(bytes32 _vaultId, bytes32 _credentialId, string memory _newEncryptedData) public {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(userVault.id != bytes32(0), "Vault not found");

        bool credentialFound = false;
        for (uint256 i = 0; i < userVault.credentials.length; i++) {
            if (userVault.credentials[i].id == _credentialId) {
                userVault.credentials[i].encryptedData = _newEncryptedData;
                credentialFound = true;
                break;
            }
        }

        require(credentialFound, "Credential not found");
        emit CredentialModified(msg.sender, _vaultId, _credentialId);
    }

    function shareVault(bytes32 _vaultId, address _userToShareWith, string memory _encryptedSymmetricKey) public {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");

        // Store the encrypted key for the new user
        encryptedKeys[_userToShareWith][_vaultId] = _encryptedSymmetricKey;

        // Add the user to the shared list
        vault.sharedWith.push(_userToShareWith);

        // Add the vault to the shared vaults mapping
        sharedVaults[_userToShareWith].push(vault);

        emit VaultShared(msg.sender, _userToShareWith, _vaultId);
    }

    function unshareVault(bytes32 _vaultId, address _userToUnshareWith) public {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");

        // Remove the encrypted symmetric key for the user
        delete encryptedKeys[_userToUnshareWith][_vaultId];

        // Remove the user from the list of shared addresses
        for (uint256 j = 0; j < vault.sharedWith.length; j++) {
            if (vault.sharedWith[j] == _userToUnshareWith) {
                vault.sharedWith[j] = vault.sharedWith[vault.sharedWith.length - 1];
                vault.sharedWith.pop();
                break;
            }
        }

        // Remove the vault from the sharedVaults mapping
        _removeSharedVault(_userToUnshareWith, _vaultId);

        emit VaultUnshared(msg.sender, _userToUnshareWith, _vaultId);
    }

    function deleteVault(bytes32 _vaultId) public {
        Vault[] storage vaults = userVaults[msg.sender];
        bool vaultFound = false;

        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                Vault storage vaultToDelete = vaults[i];
                vaultFound = true;

                // Eliminar la bóveda de los sharedVaults de los usuarios con los que se compartió
                address[] memory sharedUsers = vaultToDelete.sharedWith;
                for (uint256 j = 0; j < sharedUsers.length; j++) {
                    _removeSharedVault(sharedUsers[j], _vaultId);
                }

                // Eliminar la bóveda del array del usuario actual
                vaults[i] = vaults[vaults.length - 1];
                vaults.pop();
                break;
            }
        }

        require(vaultFound, "Vault not found or deletion failed");

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
        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                return vaults[i];
            }
        }
        revert("Vault not found");
    }

    function _removeSharedVault(address _user, bytes32 _vaultId) internal {
        Vault[] storage vaults = sharedVaults[_user];
        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                vaults[i] = vaults[vaults.length - 1];
                vaults.pop();
                return;
            }
        }
    }
}
