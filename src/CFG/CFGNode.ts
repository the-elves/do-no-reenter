import { assert, ASTNode, Statement } from "solc-typed-ast";
export enum NodeTypes{
    join="join|", 
    start="start|", 
    end="end|",
    contains_call = "calling|", 
    mutates_state = "state-mutating|"
}
export class CFGNode{
    astNode: ASTNode | undefined;
    predecessors: Array<CFGNode>;
    successors: Array<CFGNode>;
    static currentId: number = 0;
    statements: Array<ASTNode> = new Array<ASTNode>();
    id: number;
    nodetype: string;
    stateMutatingStatements = new Array<Statement>;

    public constructor(ast?: ASTNode, type?:string){
        this.astNode = undefined;
        if(ast !== undefined){
            this.astNode=ast;
        }
        this.predecessors=new Array<CFGNode>();
        this.successors=new Array<CFGNode>();
        this.id = CFGNode.currentId;
        CFGNode.currentId+=1;

        if(type !== undefined)
            this.nodetype = type;
        else
            this.nodetype = "";

    }

    getStringReprestation(file:string){
        let s = "";
        s+="<node id ="+this.id + "  type="+this.nodetype+"\n";
        for(let st of this.statements){
            s+=st.extractSourceFragment(file) + "\n";

        }
        s+="successors = [";
        for(let succ of this.successors){
            s+=succ.id+','
        }
        s+="]>"
        return s;
    }

}