import { assert, ExternalReferenceType, FunctionCall, FunctionDefinition, Identifier, MemberAccess, SourceUnit, StateVariableVisibility, XPath } from "solc-typed-ast";
import { findBlockInDefinition } from "../CFG/ASTHelper";
import { CFG } from "../CFG/CFG";
import { getCFGFromBlock } from "../CFG/CFGBuilder";
import { CFGEdge } from "../CFG/CFGEdge";
import { NodeTypes } from "../CFG/CFGNode";
import { Report } from "../Report";
import { State, STATE_VALUE } from "./State";

export enum ANALYSIS_STATUS{
    SUCCESS = "SUCCESS", 
    NO_CFG_PRESENT = "NO_CFG_PRESENT", 
    RETRY = "RETRY",
    CRASH = "CRASH"
}

export class FunctionAnalyzer{
    func: FunctionDefinition;
    cfg: CFG|undefined;
    error = new Array<string>();
    markedEdges = new Array<CFGEdge>();
    pickedEdge!:CFGEdge;
    name = "";
    filename = "";
    f2a: Map<string, FunctionAnalyzer>;

    constructor(f: FunctionDefinition,
        f2a: Map<string, FunctionAnalyzer>){
        this.func = f;
        this.f2a = f2a;
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
        console.log("[+] Analyzing "+this.cfg.name);
        let inputEdge = this.cfg.getEdgeByNodes(this.cfg.startNode, this.cfg.startNode.successors[0]);
        assert(inputEdge !== undefined, "Input edge is undefined");
        this.markedEdges.push(inputEdge);
        inputEdge.state.externalFunctionCalled=STATE_VALUE.NO
        try{
            this.runKildall();
        } catch (e){
            if(e instanceof Error){
                if(e.message.includes(ANALYSIS_STATUS.RETRY)){
                    console.log("This function calls a user defined function that has not yet beena anlyzed\n ... skipping for now and retrying")
                    return ANALYSIS_STATUS.RETRY;
                }
                return ANALYSIS_STATUS.CRASH;
            }
        }
        this.cfg.updateIdNodeMap();
        this.findErrorNodes();
        console.log("[+]Analyzed "+this.cfg.name);
        return ANALYSIS_STATUS.SUCCESS;

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
            else if(this.f2a.has(fcall.vFunctionName)){
                let analysis = this.f2a.get(fcall.vCallee.memberName);
                if(analysis?.cfg?.anyEdgeWithExternalCall()){
                    return true;
                }
            } else {
                throw Error(ANALYSIS_STATUS.RETRY);
            }
        } 
        else if(fcall.vCallee instanceof Identifier){
            if(fcall.vFunctionCallType === ExternalReferenceType.UserDefined){
                if(this.f2a.has(fcall.vFunctionName)){
                    let analysis = this.f2a.get(fcall.vCallee.name);
                    if(analysis?.cfg?.anyEdgeWithExternalCall()){
                        return true;
                    } 
                } else {
                    throw new Error(ANALYSIS_STATUS.RETRY);
                }
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
                    try{
                        if(this.checkIfCallsExternal(c)){
                            return new State(STATE_VALUE.YES);
                        }
                    }catch (e: any){
                        throw e;
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
            if(outputState.strictlyGreaterThan(e.state)){
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
            try{
                let outputState = this.computeOutputState(inputState);
                this.propagate(outputState)
            } catch (e: any) {
                throw e;
            }
        }
    }

    findErrorNodes(){
        assert(this.cfg !== undefined, "Cfg undefined");
        for(const e of this.cfg.edges){
            if(e.state.externalFunctionCalled == STATE_VALUE.YES &&
                e.dest.nodetype.includes(NodeTypes.mutates_state as string)){
                    console.log("State mutating statements after extern call");
                    for(const s of e.dest.stateMutatingStatements)
                        console.log(s)
                }
        }
    }

}