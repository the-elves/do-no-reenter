import { compileSol, ASTReader, XPath, CompilationOutput, FunctionDefinition, assert, FunctionCallOptions } from "solc-typed-ast";
import commandLineArgs from "command-line-args";
import {parse} from 'ts-command-line-args' 
import { ANALYSIS_STATUS, FunctionAnalyzer } from "./Analyzer/FunctionAnalyzer";
// const optionDefinition = [
//     {name : 'inputs', alias: 'i', multiple: true, description: "The files containing contracts to be analyzed. "}, 
// ];

interface IInputFilesArgs{
    inputs: string; 
    help?: boolean;
}

async function main(){
    // let options = commandLineArgs(optionDefinition);
    let options = parse<IInputFilesArgs>({
        inputs: {type: String, alias: 'i', multiple: true, description: 'Files to analyze'},
        help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
    },
    {
        helpArg: 'help',
        headerContentSections: [{ header: 'Do-Not-Reenter', content: 'This is an abstract interpretation based,'+
        'static analyzer to detect {bold Reentrancy bugs} in solidity smart contracts' }],
    });
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