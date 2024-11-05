// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DePass {
    IERC20 public dptToken;
    address public owner;
    uint256 public premiumPrice = 20 * 10 ** 18; // 20 DPT, assuming 18 decimals for DPT

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

    // Mapping to track premium users
    mapping(address => bool) public premiumUsers;

    // Events
    event PremiumAccessPurchased(address indexed user);
    event Withdrawal(address indexed owner, uint256 amount);
    
    event CredentialAdded(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event CredentialModified(address indexed user, bytes32 vaultId, bytes32 credentialId);
    event VaultShared(address indexed owner, address indexed sharedWith, bytes32 vaultId);
    event VaultUnshared(address indexed owner, address indexed unsharedWith, bytes32 vaultId);
    event VaultCreated(address indexed user, bytes32 vaultId, string vaultName);
    event VaultDeleted(address indexed user, bytes32 vaultId);

    constructor(IERC20 _dptToken) {
        dptToken = _dptToken;
        owner = msg.sender;
    }

    // Modifier to restrict premium functionalities
    modifier onlyPremium() {
        require(premiumUsers[msg.sender], "Access restricted to premium users");
        _;
    }

    // Modifier to limit normal users
    modifier vaultLimit() {
        require(premiumUsers[msg.sender] || userVaults[msg.sender].length < 1, "Non-premium users can only create 1 vault");
        _;
    }

    modifier credentialLimit(bytes32 _vaultId) {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(premiumUsers[msg.sender] || userVault.credentials.length < 10, "Non-premium users can only store up to 10 credentials");
        _;
    }

    // Purchase premium access by sending 20 DPT
    function buyPremiumAccess() public {
        require(!premiumUsers[msg.sender], "User is already premium");
        
        // Transfer 20 DPT tokens to the contract
        require(dptToken.transferFrom(msg.sender, address(this), premiumPrice), "Token transfer failed");
        
        // Grant premium status
        premiumUsers[msg.sender] = true;

        emit PremiumAccessPurchased(msg.sender);
    }

    // Function for the owner to withdraw DPT tokens from the contract
    function withdrawTokens() public {
        require(msg.sender == owner, "Only owner can withdraw tokens");
        uint256 balance = dptToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        require(dptToken.transferFrom(address(this), owner, balance), "Token withdrawal failed");

        emit Withdrawal(owner, balance);
    }

    function createVault(bytes32 _vaultId, string memory _vaultName, string memory _encryptedSymmetricKey) public vaultLimit {
        require(bytes(_vaultName).length > 0, "Vault name cannot be empty");

        Vault storage newVault = userVaults[msg.sender].push();
        newVault.id = _vaultId;
        newVault.name = _vaultName;

        encryptedKeys[msg.sender][_vaultId] = _encryptedSymmetricKey;

        emit VaultCreated(msg.sender, _vaultId, _vaultName);
    }

    function addCredential(bytes32 _vaultId, bytes32 _credentialId, string memory _encryptedData) public credentialLimit(_vaultId) {
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

    // Share vault function restricted to premium users
    function shareVault(bytes32 _vaultId, address _userToShareWith, string memory _encryptedSymmetricKey) public onlyPremium {
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

    // Get the number of vaults a user has
    function getVaultCount() public view returns (uint256) {
        return userVaults[msg.sender].length;
    }

    // Get the number of credentials in a specific vault
    function getCredentialCount(bytes32 _vaultId) public view returns (uint256) {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        return userVault.credentials.length;
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
