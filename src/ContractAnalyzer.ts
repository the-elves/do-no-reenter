import {CompileResult, compileSol, ASTNode, ASTReader, SourceUnit, CompileFailedError, XPath} from 'solc-typed-ast'
import { FunctionCallAnlyzer } from './FunctionCallNodeAnalyzer';

export class ContractAnalyzer{
    files: Array<string>;
    sourceUnitsIn: Map<string, SourceUnit[]>;
    
    constructor(files:Array<string>){
        this.files = files;
        this.sourceUnitsIn = new Map<string, SourceUnit[]>();
    }

    async compileFile(file:string){
        console.log("[+] Compiling contract " + file);
        try{
            let compileResult = await compileSol(file, "auto");
            console.log('  [+] Comiled successfully ' + file);
            let sourceUnits = new ASTReader().read(compileResult.data);
            this.sourceUnitsIn.set(file, sourceUnits);
        }
        catch(e: any){
            console.log('compilation failed for ' + file);
            if(e instanceof CompileFailedError){
                console.log("[+] "+ e.message);
            }
        }
    }



    compileAllFiles(){
        for(let f of this.files){
            this.compileFile(f).then(()=>{
                this.handleSourceUnitsInFile(f);
            });
        }
    }

    handleSourceUnitsInFile(file:string){
        let suArray = this.sourceUnitsIn.get(file);
        if( suArray !== undefined){
            for(let i = 0 ; i < suArray.length; i++){
                this.handleSourceUnit(suArray[i]);
            }
        }
    }

    handleSourceUnit(sU: SourceUnit){
        const xpath = new XPath(sU);
        let allFunctionCallNodes  = xpath.query("//FunctionCall");
        for(const x of allFunctionCallNodes){
            if(x.root.absolutePath.search('tests/') != 0)
                continue
            let fa = new FunctionCallAnlyzer(x);
            if(fa.callsExternal){
                let report = fa.analyze();
                if(report !== undefined){
                    report.dump()
                }
            }
        }

    }
}
