pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/ERC20/StandardToken.sol';

contract BCCToken is StandardToken {
    string public name = 'BlockchainCenterToken';
    string public symbol = 'BCCT';
    uint8 public decimals = 0;
    uint public INITIAL_SUPPLY = 10000;


    function BCCToken() public {
        totalSupply_ = INITIAL_SUPPLY;
        balances[msg.sender] = INITIAL_SUPPLY;
    }

    function transferMoney(address _to, uint256 _value, address _from) public returns (bool) {
        require(_to != address(0));
        require(_value <= balances[_from]);

        // SafeMath.sub will throw if there is not enough balance.
        balances[_from] = balances[_from].sub(_value);
        balances[_to] = balances[_to].add(_value);
        Transfer(_from, _to, _value);
        return true;
  }
}