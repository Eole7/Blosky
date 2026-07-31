/*
    This file makes a bridge between the Blockly code workspace and the transpiler.
    It re-exports the pure bridge logic so existing imports continue to work.
    All Electron dependencies have been removed; exportProject has moved to the main process IPC.
*/

const { workspaceToSyntaxTrees, blockToNode, inputsToArguments, Node, Argument } = require('./transpiler/bridge-logic.js')

module.exports = {
    workspaceToSyntaxTrees,
    blockToNode,
    inputsToArguments,
    Node,
    Argument
}
