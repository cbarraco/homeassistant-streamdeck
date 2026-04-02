// This file is the TypeScript stub for the actions barrel.
// At build time, rollup replaces this with an auto-generated module that
// imports every action file so each action can self-register via selfRegister().
// To add a new action, create its file and call selfRegister(new MyAction())
// at the bottom — no changes to this file are needed.
export { registerActions } from "./registry";
