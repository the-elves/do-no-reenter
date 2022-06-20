import { assert, ASTNode, ASTNodeFactory, Block, FunctionDefinition, UsingForDirective } from "solc-typed-ast";
import { STATE_VALUE } from "../Analyzer/State";
import  * as fs from "fs";
import { CFGEdge } from "./CFGEdge";
import { CFGNode, NodeTypes } from "./CFGNode";

export class CFG{
    nodes: Array<CFGNode> = new Array<CFGNode>();
    edges: Array<CFGEdge> = new Array<CFGEdge>();
    startNode: CFGNode = new CFGNode(undefined, NodeTypes.start);
    endNode: CFGNode = new CFGNode(undefined, NodeTypes.end);
    map!: Map<number, Array<CFGEdge>>;
    name = "";
    filename = "";

    public constructor(){
        this.nodes.push(this.startNode);
        this.nodes.push(this.endNode);
    }

    public getNodeById(id:number){
        for(let n of this.nodes){
            if (n.id == id)
                return n;
        }
    }

    public hasEdge(src: CFGNode, dest: CFGNode){
        for(let e of this.edges){
            if(src.id === e.src.id &&
                dest.id === e.dest.id)
                {
                    return true;
                }
        }
        return false;
    }

    public hasNode(node:CFGNode){
        for(let n of this.nodes){
            if(node.id == n.id )
                return true;
        }
        return false;
    }

    public checkAndAddNode(node: CFGNode){
        if(!this.hasNode(node)){
            this.nodes.push(node);
        } else
            Error("Duplicate Node added");
    }

    public checkAndAddEdge(src:CFGNode, dest:CFGNode){
        this.checkAndAddNode(src);
        this.checkAndAddNode(dest);
        if(!this.hasEdge(src, dest)){
            let newEdge = new CFGEdge(src, dest);
            this.edges.push(newEdge);
            src.successors.push(dest);
            dest.predecessors.push(src);
        } else Error("Duplicate Node added");
    }

    public addGraph(cfg:CFG){
        for(let n of cfg.nodes){
            this.checkAndAddNode(n);
            n.successors = new Array<CFGNode>();
            n.predecessors = new Array<CFGNode>();
        }
        
        for(let e of cfg.edges){
            this.checkAndAddEdge(e.src, e.dest);
        }
    }

    getEdgeByNodes(src: CFGNode,dest: CFGNode){
        if(this.hasEdge(src,dest)){
            for(let e of this.edges){
                if(src.id === e.src.id &&
                    dest.id === e.dest.id)
                    {
                        return e;
                    }
            }
        }
    }

    allIncomingEdges(dest:CFGNode){
        let incomingEdges = new Array<CFGEdge>;
        for(const e of this.edges){
            if(e.dest.id == dest.id){
                incomingEdges.push(e)
            }
        }
        return incomingEdges;
    }

    allOutgoingEdges(src:CFGNode){
        let outgoingEdges = new Array<CFGEdge>;
        for(const e of this.edges){
            if(e.src.id == src.id){
                outgoingEdges.push(e)
            }
        }
        return outgoingEdges;
    }

    updateIdNodeMap(){
        this.map= new Map<number, Array<CFGEdge>>();
        let m = this.map;
        let ids = new Array<number>();
        for(let n of this.nodes)
            ids.push(n.id);
        ids.sort();
        for(let i of ids){
            let n = this.getNodeById(i);
            if(n === undefined)
                continue
            m.set(i, this.allOutgoingEdges(n));
        }
    }

    anyEdgeWithExternalCall(){
        for(const e of this.edges){
            if(e.state.externalFunctionCalled = STATE_VALUE.YES){
                return true;
            }
        }
        return false;
    }

    getStringRepresentation(){
        let f = fs.readFileSync(this.filename);
        let o = "Edges:\n";
        for(const e of this.edges.sort((a,b)=>a.src.id-b.src.id)){
            o+=e.getStringReprestation()+'\n';
        }
        o+="Nodes:\n"
        for(const n of this.nodes.sort((a,b)=>a.id-b.id)){
            o+=n.getStringReprestation(f.toString())+'\n\n\n';
        }
        return o;
    }

    dumpToFile(){
        let filename = 'cfg-outs/'+ this.filename.split('/').pop()+':'+this.name+'.cfg';
        fs.writeFileSync(filename, this.getStringRepresentation())
    }
}