import { createSlice } from "@reduxjs/toolkit";

// The envelope every slice shares 
export const baseState = () => ({
    status:"idle", //idle | loading | succeeded | failed
    error:null, //{message,status,code,details} or null
    loadedAt:null, //number from Date.now() , used by isFresh()
    mutations:{},//per-operation {status,error}
});


//Empty slice, it is a model on how to create slice
export function createStubSlice(name){
    return createSlice({name,initialState:baseState(),reducers:{}});
}
