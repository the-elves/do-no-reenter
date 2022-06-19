contract testretstateval{
    mapping(address => uint) balances;

    function getBalances() internal returns (mapping(address => uint) ){
        return balances;
    }


}