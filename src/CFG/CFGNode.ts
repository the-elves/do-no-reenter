import { ASTNode, Statement } from "solc-typed-ast";

export class CFGNode{
    astNode: ASTNode | undefined;
    predecessors: Array<CFGNode>;
    successors: Array<CFGNode>;
    static currentId: number = 0;
    statements: Array<ASTNode> = new Array<ASTNode>();
    id: number;

    public constructor(ast?: ASTNode){
        this.astNode = undefined;
        if(ast !== undefined){
            this.astNode=ast;
        }
        this.predecessors=new Array<CFGNode>();
        this.successors=new Array<CFGNode>();
        this.id = CFGNode.currentId;
        CFGNode.currentId+=1;

    }

}