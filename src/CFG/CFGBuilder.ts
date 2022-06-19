import { assert, Assignment, ASTNode, Block, ContractDefinition, DoWhileStatement, Expression, ExpressionStatement, ForStatement, FunctionDefinition, Identifier, IfStatement, IndexAccess, Statement, VariableDeclaration, WhileStatement, XPath } from "solc-typed-ast";
import { containsFunctionCall, doesMutateState, isBranchingStatement } from "./ASTHelper";
import { CFG } from "./CFG";
import { CFGNode, NodeTypes } from "./CFGNode";



function addCurrentNodeToCFG(cfg: CFG, currentPred: CFGNode[],
    currentNode: CFGNode): CFGNode[] {
    let stateMutate = false;
    for (const s of currentNode.statements) {
        if (s instanceof ExpressionStatement) {
            let sm = doesMutateState(s);
            stateMutate ||= sm;
            if(sm)
                currentNode.stateMutatingStatements.push(s);
        }
    }

    if (stateMutate) {
        currentNode.nodetype += (NodeTypes.mutates_state);
    }

    for (let p of currentPred)
        cfg.checkAndAddEdge(p, currentNode);
    currentPred = [currentNode];
    return currentPred;
}


function handleIfStatement(s: IfStatement, cfg: CFG,
    currentPred: CFGNode[]): CFGNode[] {

    let cond = new CFGNode();
    cond.statements.push(s.vCondition);

    let postJoin = new CFGNode(undefined, NodeTypes.join);

    let trueBodyHead: CFGNode = new CFGNode();
    let falseBodyHead: CFGNode = new CFGNode();

    let trueBodyTail: CFGNode = new CFGNode();
    let falseBodyTail: CFGNode | undefined = new CFGNode();


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

    if (s.vFalseBody === undefined) {
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
            falseBodyTail = falseBlock.endNode
        }
    }

    for (const p of currentPred) {
        cfg.checkAndAddEdge(p, cond);
    }

    //add true edge
    cfg.checkAndAddEdge(cond, trueBodyHead);
    cfg.checkAndAddEdge(trueBodyTail, postJoin);

    //add false edge
    cfg.checkAndAddEdge(cond, falseBodyHead);
    if (falseBodyTail !== undefined)
        cfg.checkAndAddEdge(falseBodyTail, postJoin);


    return [postJoin];
}

function handleDoWhileStatement(s: DoWhileStatement, cfg: CFG,
    currentPred: CFGNode[]): CFGNode[] {
    let joinBeforeBody: CFGNode;
    let bodyTail: CFGNode;
    let bodyHead: CFGNode;

    let cond = new CFGNode();
    cond.statements.push(s.vCondition);

    //create a subcfg for body,
    if (s.vBody instanceof ExpressionStatement) {
        let body = new CFGNode();
        body.statements.push(s.vBody);

        joinBeforeBody = new CFGNode(undefined, NodeTypes.join);
        bodyHead = body;
        bodyTail = body;
    } else {
        assert(s.vBody instanceof Block, "s.vbody in dowhile loop is neither epxrstmt or block")
        let body = getCFGFromBlock(s.vBody);
        cfg.addGraph(body);

        joinBeforeBody = body.startNode;
        bodyHead = body.startNode
        bodyTail = body.endNode;
    }
    assert(joinBeforeBody !== undefined &&
        bodyHead !== undefined, "joinbeofre body or body undefined");

    // Now that body is created not connect edges

    //connect pred to join before body
    for (let p of currentPred) {
        cfg.checkAndAddEdge(p, joinBeforeBody);
    }

    //connect bodytail to condition
    cfg.checkAndAddEdge(bodyTail, cond);


    //create outward nodes from conditions one for body and one for loop exit
    cfg.checkAndAddEdge(cond, joinBeforeBody);
    return [cond];

}

function handleWhileStatement(s: WhileStatement, cfg: CFG,
    currentPred: CFGNode[]): CFGNode[] {
    let joinBeforeCond = new CFGNode(undefined, NodeTypes.join);

    let bodyTail: CFGNode;
    let bodyHead: CFGNode;

    let cond = new CFGNode();
    cond.statements.push(s.vCondition);
    //create a subcfg for body,
    if (s.vBody instanceof ExpressionStatement) {
        let body = new CFGNode();
        body.statements.push(s.vBody);

        bodyHead = body;
        bodyTail = body;
    } else {
        assert(s.vBody instanceof Block, "s.vbody in dowhile loop is neither epxrstmt or block")
        let body = getCFGFromBlock(s.vBody);
        cfg.addGraph(body);

        bodyHead = body.startNode
        bodyTail = body.endNode;
    }
    assert(bodyHead !== undefined, "joinbeofre body or body undefined");

    // Now that body is created not connect edges

    //connect pred to join before body
    for (let p of currentPred) {
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
    currentPred: CFGNode[]): CFGNode[] {

    let joinBeforeCond = new CFGNode(undefined, NodeTypes.join);

    let bodyTail: CFGNode;
    let bodyHead: CFGNode;

    let initializationNode = new CFGNode();

    if (s.vInitializationExpression !== undefined) {
        initializationNode.statements.push(s.vInitializationExpression);
    }

    let cond = new CFGNode();
    if (s.vCondition !== undefined) {
        cond.statements.push(s.vCondition);
    }

    //create a subcfg for body,
    if (s.vBody instanceof ExpressionStatement) {
        let body = new CFGNode();
        body.statements.push(s.vBody);

        bodyHead = body;
        bodyTail = body;
    } else {
        assert(s.vBody instanceof Block, "s.vbody in dowhile loop is neither epxrstmt or block")
        let body = getCFGFromBlock(s.vBody);
        cfg.addGraph(body);

        bodyHead = body.startNode
        bodyTail = body.endNode;
    }
    assert(bodyHead !== undefined, "joinbeofre body or body undefined");

    // Now that body is created not connect edges

    //connect pred to join before body

    for (let p of currentPred) {
        cfg.checkAndAddEdge(p, initializationNode);
    }

    cfg.checkAndAddEdge(initializationNode, joinBeforeCond);

    cfg.checkAndAddEdge(joinBeforeCond, cond);

    cfg.checkAndAddEdge(cond, bodyHead);

    cfg.checkAndAddEdge(bodyTail, joinBeforeCond);

    return [cond];

}

//handle function, continue and break
export function getCFGFromBlock(b: Block): CFG {
    let cfg = new CFG();
    let currentNode = new CFGNode();
    let currentPred = [cfg.startNode];
    for (let s of b.children) {
        if (!isBranchingStatement(s)) {
            if (!containsFunctionCall(s))
                currentNode.statements.push(s);
            else {
                if (currentNode.statements.length > 0) {
                    currentPred = addCurrentNodeToCFG(cfg, currentPred, currentNode);
                    currentNode = new CFGNode();
                }

                currentNode.statements.push(s);
                currentNode.nodetype = NodeTypes.contains_call

                currentPred = addCurrentNodeToCFG(cfg, currentPred, currentNode);
                currentNode = new CFGNode();
            }
        } else {
            currentPred = addCurrentNodeToCFG(cfg, currentPred, currentNode);
            currentNode = new CFGNode();
            if (s instanceof IfStatement) {
                currentPred = handleIfStatement(s, cfg, currentPred);
            }
            if (s instanceof DoWhileStatement) {
                currentPred = handleDoWhileStatement(s, cfg, currentPred);
            }
            if (s instanceof WhileStatement) {
                currentPred = handleWhileStatement(s, cfg, currentPred);
            }
            if (s instanceof ForStatement) {
                currentPred = handleForStatement(s, cfg, currentPred);
            }
        }
    }
    if (currentNode.statements.length != 0)
        currentPred = addCurrentNodeToCFG(cfg, currentPred, currentNode);
    for (let p of currentPred) {
        cfg.checkAndAddEdge(p, cfg.endNode);
    }
    return cfg;
}

