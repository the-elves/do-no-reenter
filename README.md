# Do-Not-Reenter
Do-Not-Reenter is an abstract interpretation based tool to detect possible re-entrancy weaknesses in solidity contracts.

### To Run
Ensure nodejs is installed

```bash
# clone the repository
$ git clone https://github.com/the-elves/do-not-reenter

# change into repository directory
$ cd do-not-reenter

# install dependencies
$ npm install
```

The arguments to npm scripts run using ```npm run```(defined in package.json) are provided after ``` -- ``` on the commandline.

usage:
```bash 

$ npm run do-not-reenter -- -h

  -i, --inputs string[]   Files to analyze        
  -h, --help              Prints this usage guide 

```

To analyze a file run

```bash
npm run do-not-reenter -- -i <path to file1> ... <path to file n>
```

### Under the hood
Following is the basic working of the tool
- This tool uses [solc-typed-ast](https://github.com/ConsenSys/solc-typed-ast) to compile solidty files into AST
- It then analyzes ast to generate a control flow graph for each function. 
- Analyze every function (Control flow graph representation) in the contracts.

### Abstract Interpretation
Abstract interpretation is a powerful technique to analyze programs. It works by working on abstract representation of state of the program Abstract interpretation calculates these abstract values at every program point.


### Abstract values used in this tool
To refresh an abstract value is associated with every location in program.

The abstract value used here encodes **if an external function may be called on any path reaching the given program location.**

This is the lattice of abstract values 


         top
         /\
        /  \
       /    \
    yes      no
       \    /
        \  /
         \/
         bot


### Description of project tree

```
├── Analyzer                 - Analyzer code
│   ├── FunctionAnalyzer.ts  - kildall and err report
│   └── State.ts             - Abs state    
├── CFG
│   ├── ASTHelper.ts         - helpers for common ast tasks
│   ├── CFGBuilder.ts        - build cfg from ast
│   ├── CFGEdge.ts
│   ├── CFGNode.ts
│   └── CFG.ts 
├── main.ts                  - Program entry point
```

Right now the interprocedural part of anlysis is performed as follows.

Intraprocedural analysis is attempted on all functions. For the function that are succesfully analyzed, analysis is stored for later use (abstract values for each program location).

If during the analysis a function call is encountered, and
 - if the **callee** is already analyzed, then if callee calls an external function, consider this function call also calls external function

 - if the **callee** is **not** analyzed yet, abort and reanlyze this function after all other remaining function are analyzed. see [caveat](caveats.md)

To determine if callee calls an external function the following property is used.

*If any any porgram location in the callee's control flow graph has an abstract value of YES consider callee calls an external function*