import { CompileFailedError, CompileResult, compileSol, ASTReader, FunctionCallOptions } from "solc-typed-ast";
import commandLineArgs from "command-line-args";
import {ContractAnalyzer} from './ContractAnalyzer'
const optionDefinition = [
    {name : 'inputs', alias: 'i', multiple: true}
];


function main(){
    let options = commandLineArgs(optionDefinition);
    let c = new ContractAnalyzer(options['inputs']);
    c.compileAllFiles();
}

main();