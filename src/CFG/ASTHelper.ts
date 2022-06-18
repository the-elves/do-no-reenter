import { ASTNode, Block, Break, Continue, DoWhileStatement, ForStatement, FunctionDefinition, IfStatement, Return, Statement, WhileStatement } from "solc-typed-ast";
import { CFGNode } from "./CFGNode";

export function findBlockInDefinition(node:FunctionDefinition): Block|undefined{
    for(let child of node.children){
        if(child instanceof Block){
            return child;
        }
    }
}
/*
 Not Handled 
    - Inline assembly
    - Placeholder statement ?
    - Revert ?
    - Throw/Try/Catch

*/
export function isBranchingStatement(node:Statement): Boolean{
    if(
        node instanceof Break ||
        node instanceof Continue ||
        node instanceof DoWhileStatement ||
        node instanceof ForStatement ||
        node instanceof IfStatement || 
        node instanceof Return ||
        node instanceof WhileStatement
    )
        return true;
    return false;
}


