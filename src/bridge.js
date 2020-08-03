/*
    This files makes a bridge between the Blockly code workspace and the transpiler
    It converts the Blockly Workspace (xml) to JSON, while reorganizing the syntax tree for better readability
*/

function exportProject(workspace, settings) {
    const transpiler = require('electron').remote.require('./transpiler/transpiler.js')
    transpiler.clearTemporaryFolder() //If the previous compilation failed
    transpiler.generateListenersClass(blocklyWorkspaceToSyntaxTree(workspace))
    transpiler.generateMainClass()
    transpiler.generatePluginConfig(settings)

    const dialog = require('electron').remote.dialog
    const options = {
        title: "Save plugin",
        buttonLabel: "Save plugin",
    }
    dialog.showSaveDialog(options).then(result => {
        if (result.canceled == false) {
            transpiler.compile(result.filePath)
            transpiler.clearTemporaryFolder()
            alert(settings["name"] + " was successfully compiled to " + result.filePath)
        } else {
            transpiler.clearTemporaryFolder()
        }
    })
}

function blocklyWorkspaceToSyntaxTree(workspace) {
    workspace = JSON.parse(require('xml-js').xml2json(workspace, {compact: true}))["xml"]
    let syntax_tree = {}
    
    if (Object.keys(workspace["block"])[0] == "0") { //If the project contains multiple events
        Object.keys(workspace["block"]).forEach(event_ID => {
            syntax_tree = blockToNode(workspace["block"][event_ID], ["nodes"], parseInt(event_ID)+1, syntax_tree)
        })
    } else { //If the project contains 1 event
        syntax_tree = blockToNode(workspace["block"], ["nodes"], 1, syntax_tree)
    }
    
    return syntax_tree
}

//This function converts a Blockly block to a node
function blockToNode(block, path, key, syntax_tree) {
    const type = block["_attributes"]["type"].split("_")
    const category = type[0]
    const ID = type[1] //The syntax ID
    let args
    let child_nodes //Nodes contained in the current node
    
    //Adding arguments
    if (block["value"] != undefined) {
        args = blockToArgument(block["value"])
    }
    
    //Sets a json value at a specific dynamic path
    path.reduce((o, k) => o[k] = o[k] || {}, syntax_tree)[key] = new Node(category, ID, args, child_nodes)

    //Adding blocks which are in the same branch as the current one
    if (block["next"] != undefined && block["next"]["block"] != undefined) {
        //Blocks followed by an event are in the same branch as the event's one, but we want them as child nodes
        if (category == "events") {
            child_nodes = blockToNode(block["next"]["block"], path.concat([key, "child_nodes"]), 1, syntax_tree)
        } else {
            blockToNode(block["next"]["block"], path, key+1, syntax_tree)
        }
    }
    
    //Adding child nodes
    if (category == "conditions" && block["statement"]["block"] != undefined) {
        child_nodes = blockToNode(block["statement"]["block"], path.concat([key, "child_nodes"]), 1, syntax_tree)
    }
    
    return syntax_tree
}

//This function converts generates arguments of a Blockly block
function blockToArgument(block) {
    let arguments = {} //The converted arguments
    let blockly_arguments = [] //The unconverted arguments - in the Blockly's format
    
    if (Object.keys(block)[0] != "0") { //If the block contains 1 argument
        blockly_arguments.push(block)
    } else { //If the block contains several arguments
        blockly_arguments = block
    }
    
    Object.keys(blockly_arguments).forEach(element => {
        let category //The syntax category
        let ID //The syntax ID
        let value
        let type
        let sub_arguments //Arguments contained in the current argument
        
        if (blockly_arguments[element]["block"]["_attributes"]["type"] == "text") {
            category = "plain_text"
            type = "String"
            value = blockly_arguments[element]["block"]["field"]["_text"]
        } else if (blockly_arguments[element]["block"]["_attributes"]["type"] == "text_join") {
            category = "argument_constructor"
        } else if (blockly_arguments[element]["block"]["_attributes"]["type"].startsWith("expressions")) {
            category = "expressions"
            ID = blockly_arguments[element]["block"]["_attributes"]["type"].split("_")[1]
        } else if(blockly_arguments[element]["block"]["_attributes"]["type"] == "parsed_as") {
            category = "parsed_as"
            type = blockly_arguments[element]["block"]["field"]["_text"]
        }
        
        if (blockly_arguments[element]["block"]["value"] != undefined) {
            sub_arguments = blockToArgument(blockly_arguments[element]["block"]["value"])
        }
        
        //If the argument is part of an argument constructor
        if (blockly_arguments[element]["_attributes"]["name"].startsWith("ADD")) {
            arguments[parseInt(blockly_arguments[element]["_attributes"]["name"].replace("ADD", ""))+1] = new Argument(category, ID, value, type, sub_arguments)
        }
        //If the argument is part of a parsed_as argument
        else if (blockly_arguments[element]["_attributes"]["name"] == "expression") {
            /*
                Instead of storing the argument of the parsed as expression as an argument, we store it as a required type
                This allows to do the conversion using the conversion methods stored in syntaxes/types.json, instead of having to create a real expression in syntaxes/expressions.json
            */
            arguments["1"] = new Argument(category, ID, value, type, sub_arguments)
        }
        else {
            arguments[blockly_arguments[element]["_attributes"]["name"]] = new Argument(category, ID, value, type, sub_arguments)
        }
    })
    
    return arguments
}

class Node {
    constructor(category, ID, args, child_nodes) {
        this.category = category
        this.ID = ID
        this.arguments = args
        this.child_nodes = child_nodes

        return this
    }
}

class Argument {
    constructor(category, ID, value, type, sub_arguments) {
        this.category = category
        this.ID = ID
        this.content = value
        this.type = type
        this.arguments = sub_arguments

        return this
    }
}
