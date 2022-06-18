export enum ExternCalled{
    YES, NO
}

export class State{
   externalFunctionCalled: ExternCalled;

   constructor(){
    this.externalFunctionCalled=ExternCalled.NO;
   }
}