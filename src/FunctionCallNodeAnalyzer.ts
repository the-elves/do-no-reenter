import { Assignment, ASTNode, Block, ContractDefinition, ExpressionStatement, FunctionCall, FunctionDefinition, Identifier, IfStatement, IndexAccess, MemberAccess, SourceUnit, Statement, VariableDeclaration } from 'solc-typed-ast';
import {NodeAnalyzer} from './NodeAnalyzer'
import { Report } from './Report';
export class FunctionCallAnlyzer extends NodeAnalyzer{
    outermostContainingBlock: Block | null = null;
    fcall: FunctionCall;
    callsExternal: Boolean = true;
    indexInBlock: number;
    containingDefinition: FunctionDefinition;
    successorStatements: Array<Statement>;

    constructor(node:FunctionCall){
        super(node);
        this.fcall = this.node as FunctionCall;
        this.callsExternal = this.checkIfCallsExternal();
        let parentInfo = this.findContainingDefinition();
        this.containingDefinition = parentInfo[0] as FunctionDefinition;
        this.outermostContainingBlock = parentInfo[0].vBody as Block;
        let idx = this.outermostContainingBlock?.children.indexOf(parentInfo[1]);
        this.indexInBlock = idx === undefined? -1 : idx
        this.successorStatements = new Array<Statement>();
        this.getSuccessorStatements();
        
    }

    findContainingDefinition(): [FunctionDefinition, ASTNode]{
        let currentNode: ASTNode|undefined = this.node;
        let prevNode: ASTNode|undefined = this.node;
        
        if(currentNode != null){
            this.outermostContainingBlock = currentNode as Block
        }

        while(currentNode != this.node.root && !(currentNode instanceof FunctionDefinition)){
            currentNode = currentNode?.parent;
            if(currentNode?.parent instanceof Block){
                prevNode = currentNode;
            }
        }
        return [currentNode as FunctionDefinition,prevNode];
    }

    checkIfCallsExternal(): Boolean{
        if(this.fcall.vCallee instanceof MemberAccess){
            let expr = this.fcall.vCallee.vExpression;
            if(expr.typeString.search('address.*')!=-1){
                return true
            }
        }
        return false;
        
    }

    isStateModifyingExpressionStatement(node: ExpressionStatement){
        
        if(node.vExpression instanceof Assignment){
            let lhs = node.vExpression.vLeftHandSide;
            if(lhs instanceof IndexAccess){
                if(lhs.vBaseExpression instanceof Identifier){
                    if(lhs.vBaseExpression.vReferencedDeclaration instanceof VariableDeclaration){
                        return lhs.vBaseExpression.vReferencedDeclaration.vScope instanceof ContractDefinition;
                    }
                }
                
            }
        }
        return false;
    }

    isStateModifyingStatement(node: ASTNode): Boolean{
        if(node instanceof ExpressionStatement){
            return this.isStateModifyingExpressionStatement(node);
        }
        if(node instanceof IfStatement){

        }
        return true;
    }

    getSuccessorStatements() {
        let currentNode: ASTNode = this.fcall;
        let prevNode:ASTNode;
        while(!(currentNode instanceof FunctionDefinition) &&
         currentNode !== undefined){
            if(currentNode.parent === undefined)
                break;
            prevNode = currentNode
            currentNode = currentNode?.parent;
            if(currentNode instanceof Block){
                let idx=(currentNode as Block).children.indexOf(prevNode);
                for(let i=idx+1;i<currentNode.children.length;i++){
                    this.successorStatements.push(currentNode.children[i])
                }
                
            }
            
        }
    }

    analyze(){
        if(this.outermostContainingBlock === undefined){
            Error("parent block determination failed");
        }
        let blockChidren = (this.outermostContainingBlock as Block)?.children
        let blockLength = blockChidren.length;
        for(let statement of this.successorStatements){
            if(this.isStateModifyingStatement(statement)){
                let reEntrancyViolation: Report = new Report(this.fcall, statement);
                return reEntrancyViolation;
            }

        }
    }

}