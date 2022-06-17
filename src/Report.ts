import { ASTNode, FunctionCall } from "solc-typed-ast";

export class Report{
    reEntrantCall!: FunctionCall;
    firstStateUpdate!: ASTNode;

    constructor(fcall:FunctionCall, expr:ASTNode){
        this.reEntrantCall = fcall;
        this.firstStateUpdate = expr;
    }

    dump(){
        console.log(`Posilbe reentrancy vulnerability due to\n\
        function call: ${this.reEntrantCall.sourceInfo}\n\
        statement: ${this.firstStateUpdate.sourceInfo}`);
    }
}