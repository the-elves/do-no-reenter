import { assert, ASTNode, Block, DoWhileStatement, ExpressionStatement, ForStatement, FunctionDefinition, IfStatement, Statement, WhileStatement } from "solc-typed-ast";
import { findBlockInDefinition, isBranchingStatement } from "./ASTHelper";
import { CFG } from "./CFG";
import { CFGEdge } from "./CFGEdge";
import { CFGNode } from "./CFGNode";

// class CFGBuilder{
//     node: FunctionDefinition;
//     rootBlock: Block;
//     cfg: CFG;
//     currentProcessingStack: Array<Array<Statement>> = new Array<Array<Statement>>();
//     predecessorStack: Array<CFGNode> = new Array<CFGNode>;
//     currentNode: CFGNode;

//     constructor(ast: FunctionDefinition){
//         this.node = ast;
//         let block = findBlockInDefinition(this.node);
//         assert(block !== undefined, "Root block not found");
//         this.rootBlock = block;
//         this.cfg = new CFG();
//         this.addBlockToProcessingStack(this.rootBlock);   
//         this.predecessorStack.push(this.cfg.startNode);
//         this.currentNode = new CFGNode();


//     }

//     buildCFG(){
//         this.processStatements;
//     }

//     addBlockToProcessingStack(b:Block){
//         let blkStmts = new Array<Statement>();
//         for (let i=b.children.length-1; i>=0 ; i--){
//             blkStmts.push(b.children[i]);
//         }
//         this.currentProcessingStack.push(blkStmts);
//     }


//     getNextStatement(){
//         let lastBlock = this.currentProcessingStack[this.currentProcessingStack.length-1];
//         assert(lastBlock !== undefined, "Lastblock undefined")
//         let stmt = lastBlock.pop();
//         return stmt;

//     }

//     processStatements(){
//         while(this.currentProcessingStack.length != 0){
//             let stmt = this.getNextStatement();
//             assert(stmt !== undefined, "undefined statement returned from currentProcessingStack")
//             if(stmt !==undefined && !isBranchingStatement(stmt)){
//                 this.currentNode.statements.push(stmt);
//             } else {
//                 this.addCurrentNodeToCFG();
//                 this.handleBranchingStatement(stmt);
//             }
//         }
//     }

//     handleBranchingStatement(stmt:Statement){
//         if(stmt instanceof IfStatement){
//             this.currentNode.statements.push(stmt.vCondition);
//             this.addCurrentNodeToCFG();
//             let condNode = this.predecessorStack[this.predecessorStack.length-1]
//             if(stmt.vTrueBody !== undefined){
//                 if(stmt.vTrueBody instanceof Statement)
//                 this.addBlockToProcessingStack(stmt.vTrueBody);
//             }
//             if(stmt.vFalseBody !== undefined){

//             }


//         } else {
//             Error("Unhandled Statement");
//         }
//     }

//     addCurrentNodeToCFG(){
//         this.cfg.checkAndAddEdge(this.currentNode, this.currentNode);
//         this.predecessorStack.pop();
//         this.predecessorStack.push(this.currentNode);
//         this.currentNode = new CFGNode();
//     }



// }


function addCurrentNodeToCFG(cfg: CFG, currentPred: CFGNode[],
    currentNode: CFGNode): CFGNode[] {
    for (let p of currentPred)
        cfg.checkAndAddEdge(p, currentNode);
    currentPred = [currentNode];
    return currentPred;
}


function handleIfStatement(s: IfStatement, cfg: CFG, 
        currentPred: CFGNode[]):CFGNode[] {
    
    let cond = new CFGNode();
    cond.statements.push(s.vCondition);

    let postJoin = new CFGNode();

    let trueBodyHead: CFGNode = new CFGNode();
    let falseBodyHead: CFGNode = new CFGNode();

    let trueBodyTail: CFGNode = new CFGNode();
    let falseBodyTail: CFGNode|undefined = new CFGNode();


    if (s.vTrueBody !== undefined) {
        if (s.vTrueBody instanceof ExpressionStatement) {
            let trueNode = new CFGNode();
            trueNode.statements.push(s);
            trueBodyHead = trueNode;
            trueBodyTail = trueNode;

        } else {
            assert((s.vTrueBody instanceof Block), "Non Block instance in handleIfStatement");
            let trueBlock = getCFGFromBlock(s.vTrueBody);
            cfg.addGraph(trueBlock);
            
            trueBodyHead = trueBlock.startNode;
            trueBodyTail = trueBlock.endNode;
        }
    } 
    
    if(s.vFalseBody === undefined){
        falseBodyHead = postJoin;
        falseBodyTail = undefined;
    } else {
        if (s.vTrueBody instanceof ExpressionStatement) {
            let falseNode = new CFGNode();
            falseNode.statements.push(s);
            
            falseBodyHead = falseNode;
            falseBodyTail = falseNode;


        } else if (s.vFalseBody instanceof Block) {
            let falseBlock = getCFGFromBlock(s.vFalseBody);
            cfg.addGraph(falseBlock);
            
            falseBodyHead = falseBlock.startNode
            falseBodyTail= falseBlock.endNode
        }
    }

    for(const p of currentPred){
        cfg.checkAndAddEdge(p, cond);
    }

    //add true edge
    cfg.checkAndAddEdge(cond, trueBodyHead);
    cfg.checkAndAddEdge(trueBodyTail,postJoin);

    //add false edge
    cfg.checkAndAddEdge(cond, falseBodyHead);
    if(falseBodyTail !== undefined)
        cfg.checkAndAddEdge(falseBodyTail,postJoin);


    return [postJoin];
}

function handleDoWhileStatement(s: DoWhileStatement, cfg: CFG, 
    currentPred: CFGNode[]):CFGNode[]{
        let joinBeforeBody: CFGNode;
        let bodyTail: CFGNode;
        let bodyHead:CFGNode;

        let cond = new CFGNode();
        cond.statements.push(s.vCondition);

        //create a subcfg for body,
        if(s.vBody instanceof ExpressionStatement){
            let body = new CFGNode();
            body.statements.push(s.vBody);

            joinBeforeBody = new CFGNode();
            bodyHead=body;
            bodyTail = body;
        } else {
            assert(s.vBody instanceof Block, "s.vbody in dowhile loop is neither epxrstmt or block")
            let body = getCFGFromBlock(s.vBody);
            cfg.addGraph(body);
            
            joinBeforeBody = body.startNode;
            bodyHead = body.startNode
            bodyTail = body.endNode;
        }
        assert(joinBeforeBody!==undefined &&
            bodyHead!== undefined, "joinbeofre body or body undefined");
        
        // Now that body is created not connect edges

        //connect pred to join before body
        for(let p of currentPred){
            cfg.checkAndAddEdge(p, joinBeforeBody);
        }

        //connect bodytail to condition
        cfg.checkAndAddEdge(bodyTail, cond);


        //create outward nodes from conditions one for body and one for loop exit
        cfg.checkAndAddEdge(cond, joinBeforeBody);
        return [cond];
        
}

function handleWhileStatement(s: WhileStatement, cfg: CFG, 
    currentPred: CFGNode[]):CFGNode[]{
        let joinBeforeCond = new CFGNode();

        let bodyTail: CFGNode;
        let bodyHead:CFGNode;
        
        let cond = new CFGNode();
        cond.statements.push(s.vCondition);
        //create a subcfg for body,
        if(s.vBody instanceof ExpressionStatement){
            let body = new CFGNode();
            body.statements.push(s.vBody);

            bodyHead=body;
            bodyTail = body;
        } else {
            assert(s.vBody instanceof Block, "s.vbody in dowhile loop is neither epxrstmt or block")
            let body = getCFGFromBlock(s.vBody);
            cfg.addGraph(body);
            
            bodyHead = body.startNode
            bodyTail = body.endNode;
        }
        assert(bodyHead!== undefined, "joinbeofre body or body undefined");
        
        // Now that body is created not connect edges

        //connect pred to join before body
        for(let p of currentPred){
            cfg.checkAndAddEdge(p, joinBeforeCond);
        }

        // connect condition to body side 
        cfg.checkAndAddEdge(joinBeforeCond, cond);

        //connect condition to boyd
        cfg.checkAndAddEdge(cond, bodyHead);

        //connect bodytail to condition
        cfg.checkAndAddEdge(bodyTail, joinBeforeCond);


        //create outward nodes from conditions one for body and one for loop exit
        return [cond];
        
}

function handleForStatement(s: ForStatement, cfg: CFG, 
    currentPred: CFGNode[]):CFGNode[]{

    let joinBeforeCond = new CFGNode();

    let bodyTail: CFGNode;
    let bodyHead:CFGNode;

    let initializationNode = new CFGNode();
    
    if(s.vInitializationExpression !== undefined){
        initializationNode.statements.push(s.vInitializationExpression);
    } 

    let cond = new CFGNode();
    if(s.vCondition !== undefined){
        cond.statements.push(s.vCondition);
    } 

    //create a subcfg for body,
    if(s.vBody instanceof ExpressionStatement){
        let body = new CFGNode();
        body.statements.push(s.vBody);

        bodyHead=body;
        bodyTail = body;
    } else {
        assert(s.vBody instanceof Block, "s.vbody in dowhile loop is neither epxrstmt or block")
        let body = getCFGFromBlock(s.vBody);
        cfg.addGraph(body);
        
        bodyHead = body.startNode
        bodyTail = body.endNode;
    }
    assert(bodyHead!== undefined, "joinbeofre body or body undefined");
    
    // Now that body is created not connect edges

    //connect pred to join before body
    
    for(let p of currentPred){
        cfg.checkAndAddEdge(p, initializationNode);
    }

    cfg.checkAndAddEdge(initializationNode, joinBeforeCond);

    cfg.checkAndAddEdge(joinBeforeCond, cond);

    cfg.checkAndAddEdge(cond, bodyHead);
    
    cfg.checkAndAddEdge(bodyTail, joinBeforeCond);
    
    return [cond];
    
}

export function getCFGFromBlock(b: Block): CFG {
    let cfg = new CFG();
    let currentNode = new CFGNode();
    let currentPred = [cfg.startNode];
    for (let s of b.children) {
        if (!isBranchingStatement(s)) {
            currentNode.statements.push(s);
        } else {
            currentPred = addCurrentNodeToCFG(cfg, currentPred, currentNode);
            currentNode = new CFGNode();
            if (s instanceof IfStatement) {
                currentPred = handleIfStatement(s, cfg, currentPred);
            } 
            if (s instanceof DoWhileStatement){
                currentPred = handleDoWhileStatement(s, cfg, currentPred);
            }
            if (s instanceof WhileStatement ){
                currentPred = handleWhileStatement(s, cfg, currentPred);
            }
            if (s instanceof ForStatement){
                currentPred = handleForStatement(s, cfg, currentPred);
            }
        }
    }
    if(currentNode.statements.length != 0)
        currentPred = addCurrentNodeToCFG(cfg, currentPred, currentNode);
    for (let p of currentPred) {
        cfg.checkAndAddEdge(p, cfg.endNode);
    }
    return cfg;
}

