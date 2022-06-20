import { assert, Assignment, ASTNode, Block, Break, Continue, ContractDefinition, DoWhileStatement, ExpressionStatement, ForStatement, FunctionDefinition, Identifier, IfStatement, Return, Statement, UnaryOperation, VariableDeclaration, WhileStatement, XPath } from "solc-typed-ast";


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
    - return
    - break
    - continue

*/
export function isBranchingStatement(node:Statement): Boolean{
    if(
        node instanceof DoWhileStatement ||
        node instanceof ForStatement ||
        node instanceof IfStatement || 
        node instanceof WhileStatement
    )
        return true;
    return false;
}

export function containsFunctionCall(s:Statement){
    let xwalker = new XPath(s);
    return xwalker.query("//FunctionCall").length != 0;

}

export function doesMutateState(node: ExpressionStatement){
    if(node.vExpression instanceof Assignment){
        let lhs = node.vExpression.vLeftHandSide;
        let id = lhs.getChildrenByType(Identifier)[0];
        if(id !== undefined){
            assert(id instanceof Identifier, "id not identifier");
            let vRefDeclaration = id.vReferencedDeclaration as VariableDeclaration;
            if(vRefDeclaration.vScope instanceof ContractDefinition){
                return true;
            }
        }
    } else if(node.vExpression instanceof UnaryOperation){
        let id = node.vExpression.vSubExpression.getChildrenByType(Identifier)[0];
        if(id !== undefined){
            assert(id instanceof Identifier, "id not identifier");
            let vRefDeclaration = id.vReferencedDeclaration as VariableDeclaration;
            if(vRefDeclaration.vScope instanceof ContractDefinition){
                return true;
            }
        }

    }
    return false;
}