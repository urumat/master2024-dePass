// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

import "./DePassPremiumStaking.sol"; // Importas el contrato Premium

interface IDePassPremiumStaking {
    function isPremium(address _user) external view returns (bool);
}

contract DePassPasswordManager {
    IDePassPremiumStaking public premiumStakingContract;

    constructor(address _premiumStakingContract) {
        premiumStakingContract = IDePassPremiumStaking(_premiumStakingContract);
    }

    struct Credential {
        bytes32 id;
        string encryptedData;
    }

    struct Vault {
        bytes32 id;
        string name;
        Credential[] credentials;
        address[] sharedWith;
    }

    mapping(address => Vault[]) private userVaults;
    mapping(address => Vault[]) private sharedVaults;
    mapping(address => mapping(bytes32 => string)) private encryptedKeys;

    event CredentialAdded(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event CredentialModified(address indexed user, bytes32 vaultId, bytes32 credentialId);
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
            Credential({id: _credentialId, encryptedData: _encryptedData})
        );

        emit CredentialAdded(msg.sender, _vaultId, _credentialId);
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
    ) public onlyPremium {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");

        encryptedKeys[_userToShareWith][_vaultId] = _encryptedSymmetricKey;
        vault.sharedWith.push(_userToShareWith);
        sharedVaults[_userToShareWith].push(vault);

        emit VaultShared(msg.sender, _userToShareWith, _vaultId);
    }

    function unshareVault(bytes32 _vaultId, address _userToUnshareWith) public {
        Vault storage vault = _getVaultById(msg.sender, _vaultId);
        require(vault.id != bytes32(0), "Vault not found");

        delete encryptedKeys[_userToUnshareWith][_vaultId];

        for (uint256 i = 0; i < vault.sharedWith.length; i++) {
            if (vault.sharedWith[i] == _userToUnshareWith) {
                vault.sharedWith[i] = vault.sharedWith[vault.sharedWith.length - 1];
                vault.sharedWith.pop();
                break;
            }
        }
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

    function getVaults() public view returns (Vault[] memory) {
        return userVaults[msg.sender];
    }

    function getSharedVaults() public view returns (Vault[] memory) {
        return sharedVaults[msg.sender];
    }
}
