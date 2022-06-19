import { assert, FunctionCall, FunctionDefinition, MemberAccess, SourceUnit, StateVariableVisibility, XPath } from "solc-typed-ast";
import { findBlockInDefinition } from "../CFG/ASTHelper";
import { CFG } from "../CFG/CFG";
import { getCFGFromBlock } from "../CFG/CFGBuilder";
import { CFGEdge } from "../CFG/CFGEdge";
import { NodeTypes } from "../CFG/CFGNode";
import { Report } from "../Report";
import { State, STATE_VALUE } from "./State";

export enum ANALYSIS_STATUS{
    COMPLETED, 
    NO_CFG_PRESENT
}

export class FunctionAnalyzer{
    func: FunctionDefinition;
    cfg: CFG|undefined;
    error = new Array<string>();
    markedEdges = new Array<CFGEdge>();
    pickedEdge!:CFGEdge;
    name = "";
    filename = "";

    constructor(f: FunctionDefinition){
        this.func = f;
        let block = findBlockInDefinition(f);
        if(block !== undefined){
            this.cfg = getCFGFromBlock(block);
            this.cfg.name = f.name;
            this.cfg.filename = (f.root as SourceUnit).absolutePath;
        }
        else
            this.error.push("could not get block from function def");
    }

    analyze(){
        if(this.cfg === undefined){
            return ANALYSIS_STATUS.NO_CFG_PRESENT;
        }

        let inputEdge = this.cfg.getEdgeByNodes(this.cfg.startNode, this.cfg.startNode.successors[0]);
        assert(inputEdge !== undefined, "Input edge is undefined");
        this.markedEdges.push(inputEdge);
        inputEdge.state.externalFunctionCalled=STATE_VALUE.NO
        this.runKildall();
        this.cfg.updateIdNodeMap();
        console.log("Analyzed "+this.cfg.name);
        this.findErrorNodes();
    }

    computeInputState(){
        assert(this.cfg != undefined, "No CFG present");
        let destnode = this.pickedEdge.dest;
        let currentState = this.pickedEdge.state;
        for(const e of this.cfg.allIncomingEdges(destnode)){
           currentState = currentState.union(e.state);
        }
        return currentState;
    }


    //handle lookup in mapping
    checkIfCallsExternal(fcall:FunctionCall): Boolean{
        if(fcall.vCallee instanceof MemberAccess){
            let expr = fcall.vCallee.vExpression;
            if(expr.typeString.search('address.*')!=-1){
                return true;
            }
            else if(expr.typeString.search('contract')!=-1)
            {
                return true;
            }
        } 
        return false;
        
    }

    computeOutputState(inputState: State){
        let dest = this.pickedEdge.dest;

        if(dest.nodetype === NodeTypes.contains_call){
            for(const s of dest.statements){
                let xwalker = new  XPath(s);
                let fcalls = xwalker.query('//FunctionCall');
                for(const c of fcalls){
                    if(this.checkIfCallsExternal(c)){
                        return new State(STATE_VALUE.YES);
                    }
                }
            }
        } 
        return inputState;
    }

    propagate(outputState:State){
        assert(this.cfg != undefined, "No CFG present");
        let destNode = this.pickedEdge.dest;
        for(const e of this.cfg.allOutgoingEdges(destNode)){
            let newState = e.state.union(outputState);
            if(outputState.strictlyGreaterThanEqualTo(e.state)){
                e.state = newState;
                this.markedEdges.push(e);
            }
        }
    }

    runKildall(){
        while(true){
            if(this.markedEdges.length == 0)
                break
            this.pickedEdge = this.markedEdges.pop() as CFGEdge;
            let inputState = this.computeInputState();
            let outputState = this.computeOutputState(inputState);
            this.propagate(outputState)
        }
    }

    findErrorNodes(){
        assert(this.cfg !== undefined, "Cfg undefined");
        for(const e of this.cfg.edges){
            if(e.state.externalFunctionCalled == STATE_VALUE.YES &&
                e.dest.nodetype.search(NodeTypes.mutates_state) !== 1){
                    console.log("State mutating statements after extern call");
                    for(const s of e.dest.stateMutatingStatements)
                        console.log(s)
                }
        }
    }

}