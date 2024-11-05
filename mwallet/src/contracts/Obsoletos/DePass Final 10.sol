// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

interface IERC20 {
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function transfer(address recipient, uint256 amount)
        external
        returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract DePass {
    IERC20 public dptToken;
    address public owner;
    uint256 public premiumPrice = 20 * 10**18; // 20 DPT
    uint256 public stakingThreshold = 200 * 10**18; // 200 DPT for premium access through staking
    uint256 public stakingAnnualInterest = 10; // Example: 10% annual interest
    uint256 public minStakingPeriod = 180 days; // 6 months minimum staking period

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

    struct Staker {
        uint256 amountStaked;
        uint256 stakingStartTime;
        bool isPremiumActive;
    }

    mapping(address => Vault[]) private userVaults;
    mapping(address => Vault[]) private sharedVaults;
    mapping(address => mapping(bytes32 => string)) private encryptedKeys;
    mapping(address => bool) public premiumUsers;
    mapping(address => Staker) public stakers;

    event PremiumAccessPurchased(address indexed user);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event Withdrawal(address indexed owner, uint256 amount);

    event CredentialAdded(
        address indexed user,
        bytes32 vaultId,
        bytes32 credentialId
    );
    event CredentialModified(
        address indexed user,
        bytes32 vaultId,
        bytes32 credentialId
    );
    event VaultShared(
        address indexed owner,
        address indexed sharedWith,
        bytes32 vaultId
    );
    event VaultUnshared(
        address indexed owner,
        address indexed unsharedWith,
        bytes32 vaultId
    );
    event VaultCreated(address indexed user, bytes32 vaultId, string vaultName);
    event VaultDeleted(address indexed user, bytes32 vaultId);

    constructor(IERC20 _dptToken) {
        dptToken = _dptToken;
        owner = msg.sender;
    }

    modifier onlyPremium() {
        require(isPremium(msg.sender), "Access restricted to premium users");
        _;
    }

    modifier vaultLimit() {
        require(
            isPremium(msg.sender) || userVaults[msg.sender].length < 1,
            "Non-premium users can only create 1 vault"
        );
        _;
    }

    modifier credentialLimit(bytes32 _vaultId) {
        Vault storage userVault = _getVaultById(msg.sender, _vaultId);
        require(
            isPremium(msg.sender) || userVault.credentials.length < 10,
            "Non-premium users can only store up to 10 credentials"
        );
        _;
    }

    // Function to check if a user is premium (paid 20 DPT or has staked 200 DPT)
    function isPremium(address _user) public view returns (bool) {
        if (premiumUsers[_user]) {
            return true;
        }
        Staker storage staker = stakers[_user];
        if (staker.amountStaked >= stakingThreshold) {
            return true;
        }
        return false;
    }

    // Purchase premium access by paying 20 DPT
    function buyPremiumAccess() public {
        require(!premiumUsers[msg.sender], "User is already premium");

        require(
            dptToken.transferFrom(msg.sender, address(this), premiumPrice),
            "Token transfer failed"
        );

        premiumUsers[msg.sender] = true;
        emit PremiumAccessPurchased(msg.sender);
    }

    // Stake DPT tokens and activate premium instantly if stakingThreshold is met
    function stakeTokens(uint256 _amount) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(
            dptToken.transferFrom(msg.sender, address(this), _amount),
            "Token transfer failed"
        );

        Staker storage staker = stakers[msg.sender];
        staker.amountStaked += _amount;
        if (staker.stakingStartTime == 0) {
            staker.stakingStartTime = block.timestamp;
        }

        if (staker.amountStaked >= stakingThreshold) {
            staker.isPremiumActive = true;
        }

        emit Staked(msg.sender, _amount);
    }

    // Unstake tokens and receive rewards, with premium limitations
    function unstakeTokens() public {
        Staker storage staker = stakers[msg.sender];
        uint256 stakedAmount = staker.amountStaked;

        require(stakedAmount > 0, "No tokens to unstake");
        require(
            block.timestamp >= staker.stakingStartTime + minStakingPeriod,
            "Minimum staking period not met"
        );

        uint256 reward = calculateReward(
            stakedAmount,
            block.timestamp - staker.stakingStartTime
        );
        uint256 totalAmount = stakedAmount + reward;

        require(
            dptToken.transfer(msg.sender, totalAmount),
            "Token transfer failed"
        );

        emit Unstaked(msg.sender, stakedAmount, reward);

        // Reset staker's info
        staker.amountStaked = 0;
        staker.stakingStartTime = 0;
        staker.isPremiumActive = false;
    }

    // Other functions remain unchanged...
    // Prevent adding new vaults or credentials if the user lost premium status
    modifier enforcePostPremiumLimits() {
        if (!isPremium(msg.sender) && !stakers[msg.sender].isPremiumActive) {
            require(
                userVaults[msg.sender].length <= 1,
                "Exceeded vault limit for non-premium users"
            );
            for (uint256 i = 0; i < userVaults[msg.sender].length; i++) {
                require(
                    userVaults[msg.sender][i].credentials.length <= 10,
                    "Exceeded credential limit for non-premium users"
                );
            }
        }
        _;
    }

    function createVault(
        bytes32 _vaultId,
        string memory _vaultName,
        string memory _encryptedSymmetricKey
    ) public enforcePostPremiumLimits vaultLimit {
        require(bytes(_vaultName).length > 0, "Vault name cannot be empty");

        Vault storage newVault = userVaults[msg.sender].push();
        newVault.id = _vaultId;
        newVault.name = _vaultName;

        encryptedKeys[msg.sender][_vaultId] = _encryptedSymmetricKey;

        emit VaultCreated(msg.sender, _vaultId, _vaultName);
    }

    function addCredential(
        bytes32 _vaultId,
        bytes32 _credentialId,
        string memory _encryptedData
    ) public enforcePostPremiumLimits credentialLimit(_vaultId) {
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

        // Remove the encrypted symmetric key for the user
        delete encryptedKeys[_userToUnshareWith][_vaultId];

        // Remove the user from the list of shared addresses
        for (uint256 j = 0; j < vault.sharedWith.length; j++) {
            if (vault.sharedWith[j] == _userToUnshareWith) {
                vault.sharedWith[j] = vault.sharedWith[
                    vault.sharedWith.length - 1
                ];
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

    function withdrawTokens() public {
        require(msg.sender == owner, "Only owner can withdraw tokens");
        uint256 balance = dptToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        require(dptToken.transfer(owner, balance), "Token withdrawal failed");

        emit Withdrawal(owner, balance);
    }

    function calculateReward(uint256 _amount, uint256 _timeStaked)
        public
        view
        returns (uint256)
    {
        // Calcular la recompensa proporcional al tiempo exacto de staking en segundos
        return
            (_amount * stakingAnnualInterest * _timeStaked) / (365 days * 100);
    }

    function getStakedTokens(address _user) public view returns (uint256) {
        return stakers[_user].amountStaked;
    }

    function getAccumulatedRewards(address _user)
        public
        view
        returns (uint256)
    {
        Staker storage staker = stakers[_user];
        uint256 stakingTime = block.timestamp - staker.stakingStartTime;
        return calculateReward(staker.amountStaked, stakingTime);
    }

    function getStakingStartTime(address _user) public view returns (uint256) {
        Staker storage staker = stakers[_user];
        require(staker.stakingStartTime > 0, "User has not started staking");
        return block.timestamp - staker.stakingStartTime;
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
}
