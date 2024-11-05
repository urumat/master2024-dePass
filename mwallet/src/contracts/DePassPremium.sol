// SPDX-License-Identifier: MIT
pragma solidity >=0.8.2 <0.9.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract DePassPremiumStaking {
    IERC20 public dptToken;
    address public owner;
    uint256 public premiumPrice = 20 * 10**18; // 20 DPT
    uint256 public stakingThreshold = 200 * 10**18; // 200 DPT for premium access through staking
    uint256 public stakingAnnualInterest = 10; // Example: 10% annual interest
    uint256 public minStakingPeriod = 180 days; // 6 months minimum staking period

    struct Staker {
        uint256 amountStaked;
        uint256 stakingStartTime;
        bool isPremiumActive;
    }

    mapping(address => bool) public premiumUsers;
    mapping(address => Staker) public stakers;

    event PremiumAccessPurchased(address indexed user);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount, uint256 reward);
    event Withdrawal(address indexed owner, uint256 amount);

    constructor(IERC20 _dptToken) {
        dptToken = _dptToken;
        owner = msg.sender;
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

    function calculateReward(uint256 _amount, uint256 _timeStaked)
        public
        view
        returns (uint256)
    {
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

    function withdrawTokens() public {
        require(msg.sender == owner, "Only owner can withdraw tokens");
        uint256 balance = dptToken.balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");

        require(dptToken.transfer(owner, balance), "Token withdrawal failed");

        emit Withdrawal(owner, balance);
    }
}
