/*
    This files makes a bridge between the Blockly code workspace and the transpiler
    It converts the Blockly Workspace (xml) to JSON, while reorganizing the syntax tree for better readability/usability
*/

function exportProject(workspace, settings) {
    const {Transpiler} = require('electron').remote.require('./transpiler/transpiler.js')
    let syntax_tree = workspaceToSyntaxTrees(workspace)
    const transpiler = new Transpiler(syntax_tree["listeners"], syntax_tree["commands"], settings)
    transpiler.clearTemporaryFolder() //If the previous compilation failed
    transpiler.generateListenersClass()
    transpiler.generateCommandsClass()
    transpiler.generateMainClass()
    transpiler.generatePluginConfig()

    const dialog = require('electron').remote.dialog
    const options = {
        title: "Save plugin",
        buttonLabel: "Save plugin",
    }
    dialog.showSaveDialog(options).then(result => {
        if(result.canceled == false) {
            transpiler.compile(result.filePath)
            alert(settings["name"] + " was successfully compiled to " + result.filePath)
        }
        transpiler.clearTemporaryFolder()
    })
}

function workspaceToSyntaxTrees(workspace) {
    workspace = JSON.parse(require('xml-js').xml2json(workspace, {compact: true}))["xml"]

    //The workspace is split into 2 syntax trees, one for the listeners and another for commands (so they can be put in different Java classes)
    let listeners_syntax_tree = {}
    let commands_syntax_tree = {}

    if(Array.isArray(workspace["block"])) { //If the project contains several events
        let next_listeners_event_ID = 1
        let next_commands_event_ID = 1

        Object.keys(workspace["block"]).forEach(event_index => {
            if(workspace["block"][event_index]["_attributes"]["type"].startsWith("commands")) {
                commands_syntax_tree = blockToNode(workspace["block"][event_index], ["nodes"], next_commands_event_ID, commands_syntax_tree)
                next_commands_event_ID++
            } else {
                listeners_syntax_tree = blockToNode(workspace["block"][event_index], ["nodes"], next_listeners_event_ID, listeners_syntax_tree)
                next_listeners_event_ID++
            }
        })
    } else { //If the project contains 1 event
        if(workspace["block"]["_attributes"]["type"].startsWith("commands")) {
            commands_syntax_tree = blockToNode(workspace["block"], ["nodes"], 1, commands_syntax_tree)
        } else {
            listeners_syntax_tree = blockToNode(workspace["block"], ["nodes"], 1, listeners_syntax_tree)
        }
    }
    
    return {
        "listeners": listeners_syntax_tree,
        "commands": commands_syntax_tree
    }
}

/*
    This function converts a Blockly block to a node
    The syntax tree is passed at every call, and new things a written to it, as Blockly's workspace output is differently organized:
        every block is stored inside inside the previous block, even if they are in the same branch
    
    TODO: write the child nodes from the return of the function, not at the execution of the function (without path.reduce)
*/
function blockToNode(block, path, key, syntax_tree) {
    const type = block["_attributes"]["type"].split("_")
    const category = type[0] //The syntax category
    const ID = type[1] //The syntax ID
    let args //The block's arguments
    
    //Gets arguments
    if(block["value"] != undefined || block["field"] != undefined) {
        args = inputsToArguments(block["value"] != undefined ? block["value"] : null, block["field"] != undefined ? block["field"] : null)
    }
    
    //Sets a json value at a specific dynamic path
    path.reduce((o, k) => o[k] = o[k] || {}, syntax_tree)[key] = new Node(category, ID, args)

    //Adds blocks that are in the same branch as the current one
    if(block["next"] != undefined && block["next"]["block"] != undefined) {
        //Blocks followed by an event/command registration are in the same branch as the event's one, but we want them as child nodes
        if(category == "events" || category == "commands") {
            syntax_tree = blockToNode(block["next"]["block"], path.concat([key, "child_nodes"]), 1, syntax_tree)
        } else {
            syntax_tree = blockToNode(block["next"]["block"], path, key+1, syntax_tree)
        }
    }
    
    //Writes child nodes to the syntax_tree
    if(block["statement"] != undefined) {
        syntax_tree = blockToNode(block["statement"]["block"], path.concat([key, "child_nodes"]), 1, syntax_tree)
    }
    
    return syntax_tree
}

/*
    Generates arguments of a node

    There are two types of arguments
    input_blocks: ie expression
    input_values: raw text, ie RegisterCommand
*/
function inputsToArguments(input_blocks, input_values) {
    let arguments = {} //The converted arguments

    if(input_values != null) {
        if(Array.isArray(input_values)) { //If there are several arguments
            Object.keys(input_values).forEach(index => {
                let field_name = input_values[index]["_attributes"]["name"]
                arguments[field_name] = {
                    "category": "plain_text", 
                    "value": input_values[index]["_text"],
                    "type": "String"
                }
            })
        } else { //If there is one argument
            let field_name = input_values["_attributes"]["name"]
            arguments[field_name] = {
                "category": "plain_text", 
                "value": input_values["_text"],
                "type": "String"
            }
        }
    }

    if(input_blocks != null) {
        //If there is only one argument, we store it as an element of an array (the same way as if there are several arguments)
        if(!(Array.isArray(input_blocks))) { 
            const original = input_blocks
            input_blocks = []
            input_blocks.push(original)
        }

        Object.keys(input_blocks).forEach(index => {
            let category //The syntax category
            let ID //The syntax ID
            let value //The String value
            let type //The Java type
            let sub_arguments //Arguments contained in the current argument
            
            //Getting all the properties of the current argument
            if(input_blocks[index]["block"]["_attributes"]["type"] == "text") {
                category = "plain_text"
                type = "String"
                value = input_blocks[index]["block"]["field"]["_text"]
            } else if(input_blocks[index]["block"]["_attributes"]["type"] == "text_join") {
                category = "argument_constructor"
            } else if(input_blocks[index]["block"]["_attributes"]["type"].startsWith("expressions")) {
                category = "expressions"
                ID = input_blocks[index]["block"]["_attributes"]["type"].split("_")[1]
            } else if(input_blocks[index]["block"]["_attributes"]["type"].startsWith("conditions")) {
                category = "conditions"
                ID = input_blocks[index]["block"]["_attributes"]["type"].split("_")[1]
            } else if(input_blocks[index]["block"]["_attributes"]["type"] == "parsed_as") {
                category = "parsed_as"
                type = input_blocks[index]["block"]["field"]["_text"]
            }
            
            //Adding arguments of the current argument
            if(input_blocks[index]["block"]["value"] != undefined || input_blocks[index]["block"]["field"] != undefined) {
                sub_arguments = inputsToArguments(input_blocks[index]["block"]["value"] != undefined ? input_blocks[index]["block"]["value"] : null, 
                                                 input_blocks[index]["block"]["field"] != undefined ? input_blocks[index]["block"]["field"] : null)
            }
            //If the current argument is a subargument of an argument constructor
            if(input_blocks[index]["_attributes"]["name"].startsWith("ADD")) {
                arguments[
                    parseInt(
                        input_blocks[index]["_attributes"]["name"].replace("ADD", "")
                    )+1
                ] = new Argument(category, ID, value, type, sub_arguments)
            }
            //If the current argument is the subargument of a parsed_as argument
            else if(input_blocks[index]["_attributes"]["name"] == "expression") {
                /*
                    Instead of storing the argument of the parsed as expression as an argument, we store it as a required type
                    This allows to do the conversion using the conversion methods stored in syntaxes/types.json, instead of having to create a real expression in syntaxes/expressions.json
                */
                arguments["1"] = new Argument(category, ID, value, type, sub_arguments)
            }
             //Just a simple argument
            else {
                arguments[input_blocks[index]["_attributes"]["name"]] = new Argument(category, ID, value, type, sub_arguments)
            }
        })
    }

    return arguments
}

class Node {
    constructor (category, ID, args) {
        this.category = category
        this.ID = ID
        this.arguments = args

        return this
    }
}

class Argument {
    constructor (category, ID, value, type, sub_arguments) {
        this.category = category
        this.ID = ID
        this.value = value
        this.type = type
        this.arguments = sub_arguments

        return this
    }
}
