import { State } from "../Analyzer/State";
import { CFGNode } from "./CFGNode";

export class CFGEdge{
    src: CFGNode;
    dest: CFGNode;
    static id: number;
    state: State = new State();
    
    constructor(s: CFGNode,d: CFGNode){
        this.src = s;
        this.dest = d;
        CFGEdge.id+=1;
    }

    getStringReprestation(){
        let s = "";
        s+="<node src-id = "+this.src.id +" dest-id = "+
        this.dest.id+ " desttype="+this.dest.nodetype+"  state= "+this.state.externalFunctionCalled+">";
        return s;
    }
}