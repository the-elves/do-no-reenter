import { CompileFailedError, CompileResult, compileSol, ASTReader, FunctionCallOptions, Assignment, XPath } from "solc-typed-ast";
import commandLineArgs from "command-line-args";
import { getCFGFromBlock } from "./CFG/CFGBuilder";
import { CFG } from "./CFG/CFG";
const optionDefinition = [
    {name : 'inputs', alias: 'i', multiple: true}
];


async function main(){
    let options = commandLineArgs(optionDefinition);
    for(const f of options['inputs']){
        let c = await compileSol(f,"auto");
        let su = new ASTReader().read(c.data);
        let xwalker = new XPath(su[0]);
        let fdefs = xwalker.query('SourceUnit/ContractDefinition/FunctionDefinition/Block');
        let cfg:CFG;
        for(let b of fdefs ){
            cfg = getCFGFromBlock(b);
        }
        console.log(su);
    }
}

main();