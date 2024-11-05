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

    struct VaultInfo {
        bytes32 id;
        string name;
        Credential[] credentials;
        address[] sharedWith;
    }

    // Mapping to store the vaults created by each user
    mapping(address => Vault[]) private userVaults;
    
    // Mapping to track which vaults have been shared with a user (vaultId => owner address)
    mapping(address => mapping(bytes32 => address)) private vaultAccess;

    // Array to store the vault IDs shared with each user
    mapping(address => bytes32[]) private sharedVaultIds;

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

        newVault.encryptedKeys[msg.sender] = _encryptedSymmetricKey;

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

        // Almacenar la clave cifrada para el nuevo usuario
        vault.encryptedKeys[_userToShareWith] = _encryptedSymmetricKey;

        // Agregar el usuario a la lista de compartidos
        vault.sharedWith.push(_userToShareWith);

        // Registrar el acceso del usuario a la bóveda
        vaultAccess[_userToShareWith][_vaultId] = msg.sender;

        // Agregar el vaultId a la lista de bóvedas compartidas con el usuario
        sharedVaultIds[_userToShareWith].push(_vaultId);

        emit VaultShared(msg.sender, _userToShareWith, _vaultId);
    }

    function unshareVault(bytes32 _vaultId, address _userToUnshareWith) public {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");

        // Remove the encrypted symmetric key for the user
        delete vault.encryptedKeys[_userToUnshareWith];

        // Remove the user from the list of shared addresses
        for (uint256 j = 0; j < vault.sharedWith.length; j++) {
            if (vault.sharedWith[j] == _userToUnshareWith) {
                vault.sharedWith[j] = vault.sharedWith[vault.sharedWith.length - 1];
                vault.sharedWith.pop();
                break;
            }
        }

        // Remove the vault access for the user
        delete vaultAccess[_userToUnshareWith][_vaultId];

        // Remove the vaultId from the list of sharedVaultIds
        for (uint256 i = 0; i < sharedVaultIds[_userToUnshareWith].length; i++) {
            if (sharedVaultIds[_userToUnshareWith][i] == _vaultId) {
                sharedVaultIds[_userToUnshareWith][i] = sharedVaultIds[_userToUnshareWith][sharedVaultIds[_userToUnshareWith].length - 1];
                sharedVaultIds[_userToUnshareWith].pop();
                break;
            }
        }

        emit VaultUnshared(msg.sender, _userToUnshareWith, _vaultId);
    }

    function deleteVault(bytes32 _vaultId) public {
        Vault[] storage vaults = userVaults[msg.sender];
        bool vaultDeleted = false;

        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                delete vaults[i];
                vaultDeleted = true;
                break;
            }
        }

        require(vaultDeleted, "Vault not found or deletion failed");

        emit VaultDeleted(msg.sender, _vaultId);
    }

    function getVaults() public view returns (VaultInfo[] memory) {
        Vault[] storage vaults = userVaults[msg.sender];
        VaultInfo[] memory vaultInfos = new VaultInfo[](vaults.length);

        for (uint256 i = 0; i < vaults.length; i++) {
            vaultInfos[i] = VaultInfo({
                id: vaults[i].id,
                name: vaults[i].name,
                credentials: vaults[i].credentials,
                sharedWith: vaults[i].sharedWith
            });
        }

        return vaultInfos;
    }

    function getSharedVaults() public view returns (VaultInfo[] memory) {
        uint256 sharedVaultCount = sharedVaultIds[msg.sender].length;
        VaultInfo[] memory sharedVaults = new VaultInfo[](sharedVaultCount);

        for (uint256 i = 0; i < sharedVaultCount; i++) {
            bytes32 vaultId = sharedVaultIds[msg.sender][i];
            address vaultOwner = vaultAccess[msg.sender][vaultId];

            Vault storage sharedVault = _getVaultById(vaultOwner, vaultId);

            sharedVaults[i] = VaultInfo({
                id: sharedVault.id,
                name: sharedVault.name,
                credentials: sharedVault.credentials,
                sharedWith: sharedVault.sharedWith
            });
        }

        return sharedVaults;
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
}
