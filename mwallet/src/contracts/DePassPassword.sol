// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

import "./DePassPremium.sol"; // Importas el contrato Premium

interface IDePassPremiumStaking {
    function isPremium(address _user) external view returns (bool);
}

contract DePassPasswordManager {
    IDePassPremiumStaking public premiumStakingContract;

    constructor(address _premiumStakingContract) {
        premiumStakingContract = IDePassPremiumStaking(_premiumStakingContract);
    }

    struct Credential {
        bytes32 id; // Unique ID for the credential
        //string encryptedData; // Stores credentials as encrypted JSON
    }

    struct Vault {
        bytes32 id; // Unique vault ID (256 bits)
        string name;
        Credential[] credentials;
        address[] sharedWith; // List of addresses with whom the vault is shared
        address owner;
    }

    struct SharedVaultInfo {
        bytes32 vaultId;
        address owner;
    }

    struct VaultKey {
        bytes32 vaultId;
        string encryptedKey;
    }

    // Mapping to store the vaults created by each user
    mapping(address => Vault[]) private userVaults;
    
    // Mapping to track which vaults have been shared with a user, including owner info
    mapping(address => SharedVaultInfo[]) private sharedVaultIds;

    // Mapping to store encrypted symmetric keys associated with each vault and user
    mapping(address => mapping(bytes32 => string)) private encryptedKeys;

    event CredentialAdded(
        address indexed user, 
        bytes32 indexed vaultId, 
        bytes32 indexed credentialId, 
        string encryptedData
    );

    event VaultShared(address indexed owner, address indexed sharedWith, bytes32 vaultId);
    event VaultUnshared(address indexed owner, address indexed unsharedWith, bytes32 vaultId);
    event VaultCreated(address indexed user, bytes32 vaultId, string vaultName);
    event VaultDeleted(address indexed user, bytes32 vaultId);

    // Modificador para limitar a los usuarios no premium a una sola vault
    modifier vaultLimit() {
        if (!premiumStakingContract.isPremium(msg.sender)) {
            require(userVaults[msg.sender].length < 1, "Non-premium users can only create 1 vault");
        }
        _;
    }

    // Modificador para limitar a los usuarios no premium a 10 contraseñas por vault
    modifier credentialLimit(bytes32 _vaultId) {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        if (!premiumStakingContract.isPremium(msg.sender)) {
            require(userVault.credentials.length < 10, "Non-premium users can only store up to 10 credentials");
        }
        _;
    }

    modifier onlyPremium() {
        require(premiumStakingContract.isPremium(msg.sender), "Not a premium user");
        _;
    }

    // Crear una bóveda con límite para usuarios no premium
    function createVault(
        bytes32 _vaultId,
        string memory _vaultName,
        string memory _encryptedSymmetricKey
    ) public vaultLimit() {
        require(bytes(_vaultName).length > 0, "Vault name cannot be empty");

        Vault storage newVault = userVaults[msg.sender].push();
        newVault.id = _vaultId;
        newVault.name = _vaultName;
        newVault.owner = msg.sender;

        encryptedKeys[msg.sender][_vaultId] = _encryptedSymmetricKey;

        emit VaultCreated(msg.sender, _vaultId, _vaultName);
    }

    // Añadir credencial con límite para usuarios no premium
    function addCredential(
        bytes32 _vaultId,
        bytes32 _credentialId,
        string memory _encryptedData
    ) public credentialLimit(_vaultId) {
        require(_credentialId != bytes32(0), "Credential ID cannot be empty");

        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(userVault.id != bytes32(0), "Vault not found");
        
        userVault.credentials.push(
            Credential({id: _credentialId})
        );

        emit CredentialAdded(msg.sender, _vaultId, _credentialId, _encryptedData);
    }

    function modifyCredential(
        bytes32 _vaultId,
        bytes32 _credentialId,
        string memory _newEncryptedData
    ) public {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(userVault.id != bytes32(0), "Vault not found");

        bool credentialFound = false;
        for (uint256 i = 0; i < userVault.credentials.length; i++) {
            if (userVault.credentials[i].id == _credentialId) {
                //userVault.credentials[i].encryptedData = _newEncryptedData;
                credentialFound = true;
                break;
            }
        }

        require(credentialFound, "Credential not found");
        emit CredentialAdded(msg.sender, _vaultId, _credentialId, _newEncryptedData);
    }

    function shareVault(
        bytes32 _vaultId,
        address _userToShareWith,
        string memory _encryptedSymmetricKey
    ) public onlyPremium {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");

        // Store the encrypted key for the new user
        encryptedKeys[_userToShareWith][_vaultId] = _encryptedSymmetricKey;

        // Add the user to the shared list
        vault.sharedWith.push(_userToShareWith);

        // Add the vault ID and owner to the shared vaults for the user
        sharedVaultIds[_userToShareWith].push(SharedVaultInfo({
            vaultId: _vaultId,
            owner: msg.sender
        }));

        emit VaultShared(msg.sender, _userToShareWith, _vaultId);
    }

    // Función auxiliar para verificar si una dirección está en una lista de direcciones
    function isAddressInList(address[] memory list, address target) internal pure returns (bool) {
        for (uint i = 0; i < list.length; i++) {
            if (list[i] == target) {
                return true;
            }
        }
        return false;
    }

    // Function to unshare a vault with a specific user
    function unshareVault(bytes32 _vaultId, address _userToUnshareWith) public {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");
        // User must be the owner or the user to whom the vault was shared with
        require(vault.owner == msg.sender || _userToUnshareWith == msg.sender, "Permission denied");
        // Vault must be shared with this user
        require(isAddressInList(vault.sharedWith, _userToUnshareWith), "User not shared with this vault");

        // Remove the user from the sharedWith array
        for (uint i = 0; i < vault.sharedWith.length; i++) {
            if (vault.sharedWith[i] == _userToUnshareWith) {
                vault.sharedWith[i] = vault.sharedWith[vault.sharedWith.length - 1];
                vault.sharedWith.pop();
                break;
            }
        }

        // Remove the vault ID from the user's shared vaults
        _removeSharedVault(_userToUnshareWith, _vaultId);

        // Delete the encrypted key for the unshared user
        delete encryptedKeys[_userToUnshareWith][_vaultId];

        emit VaultUnshared(msg.sender, _userToUnshareWith, _vaultId);
    }

    // Function to delete a vault owned by the user
    function deleteVault(bytes32 _vaultId) public {
        Vault[] storage vaults = userVaults[msg.sender];
        uint indexToDelete = type(uint).max;
        
        for (uint i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                indexToDelete = i;
                break;
            }
        }
        require(indexToDelete != type(uint).max, "Vault not found");

        Vault storage vault = vaults[indexToDelete];

        // Unshare the vault from all shared users
        for (uint i = 0; i < vault.sharedWith.length; i++) {
            address sharedUser = vault.sharedWith[i];
            _removeSharedVault(sharedUser, _vaultId);
            delete encryptedKeys[sharedUser][_vaultId];
        }

        // Remove the vault from the user's vault list
        vaults[indexToDelete] = vaults[vaults.length - 1];
        vaults.pop();

        emit VaultDeleted(msg.sender, _vaultId);
    }

    function getVaults() public view returns (Vault[] memory) {
        return userVaults[msg.sender];
    }

    // Function to retrieve vaults shared with the user
    function getSharedVaults() public view returns (Vault[] memory) {
        uint sharedVaultCount = sharedVaultIds[msg.sender].length;
        Vault[] memory sharedVaults = new Vault[](sharedVaultCount);

        for (uint i = 0; i < sharedVaultCount; i++) {
            SharedVaultInfo storage sharedVaultInfo = sharedVaultIds[msg.sender][i];
            Vault storage vault = _getVaultById(sharedVaultInfo.owner, sharedVaultInfo.vaultId);
            sharedVaults[i] = vault;
        }

        return sharedVaults;
    }

    // Vault could belong to user or be shared with user
    function _getVaultById(address _user, bytes32 _vaultId)
        internal
        view
        returns (Vault storage)
    {
        Vault[] storage vaults = userVaults[_user];
        for (uint256 i = 0; i < vaults.length; i++) {
            if (vaults[i].id == _vaultId) {
                return vaults[i];
            }
        }

        SharedVaultInfo[] storage sharedVaultsInfo = sharedVaultIds[_user];
        for (uint i = 0; i < sharedVaultsInfo.length; i++) {
            if (sharedVaultsInfo[i].vaultId == _vaultId) {
                // Warning: Recursive call
                // If there is a sharedVaultInfo with that owner he must have the vault
                return _getVaultById(sharedVaultsInfo[i].owner, _vaultId);
            }
        }

        revert("Vault not found");
    }

    // Helper function to remove a shared vault from a user's shared vaults
    function _removeSharedVault(address user, bytes32 _vaultId) private {
        uint sharedVaultCount = sharedVaultIds[user].length;
        for (uint i = 0; i < sharedVaultCount; i++) {
            if (sharedVaultIds[user][i].vaultId == _vaultId) {
                sharedVaultIds[user][i] = sharedVaultIds[user][sharedVaultCount - 1];
                sharedVaultIds[user].pop();
                break;
            }
        }
    }

    // Función para obtener todas las claves encriptadas del usuario, tanto de sus bóvedas como de las compartidas
    function getAllEncryptedKeys() public view returns (VaultKey[] memory) {
        uint totalVaults = userVaults[msg.sender].length + sharedVaultIds[msg.sender].length;
        VaultKey[] memory keys = new VaultKey[](totalVaults);

        uint index = 0;

        // Bóvedas propias del usuario
        for (uint i = 0; i < userVaults[msg.sender].length; i++) {
            Vault memory vault = userVaults[msg.sender][i];
            keys[index] = VaultKey({
                vaultId: vault.id,
                encryptedKey: encryptedKeys[msg.sender][vault.id]
            });
            index++;
        }

        // Bóvedas compartidas con el usuario
        for (uint i = 0; i < sharedVaultIds[msg.sender].length; i++) {
            SharedVaultInfo storage sharedVaultInfo = sharedVaultIds[msg.sender][i];
            keys[index] = VaultKey({
                vaultId: sharedVaultInfo.vaultId,
                encryptedKey: encryptedKeys[msg.sender][sharedVaultInfo.vaultId]
            });
            index++;
        }

        return keys;
    }

    function getVaultCount() public view returns (uint256) {
        return userVaults[msg.sender].length;
    }

    function getCredentialCount(bytes32 _vaultId)
        public
        view
        returns (uint256)
    {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        return userVault.credentials.length;
    }
}
