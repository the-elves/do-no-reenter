import { CompileFailedError, CompileResult, compileSol, ASTReader, FunctionCallOptions, Assignment, XPath, CompilationOutput, FunctionDefinition } from "solc-typed-ast";
import commandLineArgs from "command-line-args";
import { getCFGFromBlock } from "./CFG/CFGBuilder";
import { CFG } from "./CFG/CFG";
import { FunctionAnalyzer } from "./Analyzer/FunctionAnalyzer";
const optionDefinition = [
    {name : 'inputs', alias: 'i', multiple: true}
];


async function main(){
    let options = commandLineArgs(optionDefinition);
    let function2analysis = new Map<FunctionDefinition, FunctionAnalyzer>();
    for(const i of options['inputs']){
        let c = await compileSol(i,"auto", undefined, [CompilationOutput.IR, CompilationOutput.AST]);
        let sus = new ASTReader().read(c.data);
        for(const su of sus){
            let xwalker = new XPath(su);
            let fdefs = xwalker.query('SourceUnit/ContractDefinition/FunctionDefinition');
            for(const f of fdefs){
                let analysis = new FunctionAnalyzer(f);
                analysis.analyze();
                function2analysis.set(f.name, analysis);
            }
        }
    }

}

main();