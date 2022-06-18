import { CFGNode } from "./CFGNode";

export class CFGEdge{
    src: CFGNode;
    dest: CFGNode;
    static id: number;
    
    constructor(s: CFGNode,d: CFGNode){
        this.src = s;
        this.dest = d;
        CFGEdge.id+=1;
    }
}