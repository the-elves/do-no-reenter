Updating description in some time

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
