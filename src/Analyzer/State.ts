export enum STATE_VALUE{
    BOT=0, NO=1, YES=2
}

export class State{
   externalFunctionCalled: STATE_VALUE;

   constructor(initVal?: STATE_VALUE){
    if(initVal !== undefined){
        this.externalFunctionCalled = initVal;
    } else {
        this.externalFunctionCalled=STATE_VALUE.BOT;
    }
   }

   greaterThanEqualTo(other: State){
    return this.externalFunctionCalled >= other.externalFunctionCalled;
   }

   strictlyGreaterThan(other: State){
    return this.externalFunctionCalled > other.externalFunctionCalled;
   }

   union(other:State){
    return new State(Math.max(this.externalFunctionCalled, other.externalFunctionCalled))
   }
}