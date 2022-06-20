import { CompileFailedError, CompileResult, compileSol, ASTReader, FunctionCallOptions, Assignment, XPath, CompilationOutput, FunctionDefinition, assert } from "solc-typed-ast";
import commandLineArgs from "command-line-args";
import { getCFGFromBlock } from "./CFG/CFGBuilder";
import { CFG } from "./CFG/CFG";
import { ANALYSIS_STATUS, FunctionAnalyzer } from "./Analyzer/FunctionAnalyzer";
const optionDefinition = [
    {name : 'inputs', alias: 'i', multiple: true}
];


async function main(){
    let options = commandLineArgs(optionDefinition);
    let function2analysis = new Map<string, FunctionAnalyzer>();
    for(const i of options['inputs']){
        let c = await compileSol(i,"auto", undefined, [CompilationOutput.IR, CompilationOutput.AST]);
        let sus = new ASTReader().read(c.data);
        for(const su of sus){
            let xwalker = new XPath(su);
            let ufdefs = xwalker.query('SourceUnit/ContractDefinition/FunctionDefinition');
            // best-effort retry-based algorithm to analyze the callee functions first
            // a call to function that in turn makes an external call is considered calling
            // external function itself. 
            let fdefs = ufdefs as [FunctionDefinition];
            let retry: [FunctionDefinition];
            while(fdefs.length >0){
                let f = fdefs.pop();
                assert(f !== undefined, "function in processing queue is undefined");
                let analysis = new FunctionAnalyzer(f, function2analysis);
                let analysisResult = analysis.analyze();
                if(analysisResult === ANALYSIS_STATUS.RETRY){
                    fdefs.splice(0, 0, f);
                } else if(analysisResult === ANALYSIS_STATUS.SUCCESS) {
                    function2analysis.set(f.name, analysis);
                }
            }
        }
    }
}

main();