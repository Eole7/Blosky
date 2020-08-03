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
    const project = JSON.parse(require('xml-js').xml2json(workspace, {compact: true}))["xml"]
    let syntax_tree = {}
    
    if (Object.keys(project["block"])[0] == "0") { //If the project contains multiple events
        Object.keys(project["block"]).forEach(event_ID => {
            syntax_tree = blockToNode(project["block"][event_ID], ["nodes"], parseInt(event_ID)+1, syntax_tree)
        })
    } else { //If the project contains 1 event
        syntax_tree = blockToNode(project["block"], ["nodes"], 1, syntax_tree)
    }
    
    return syntax_tree
}

function blockToNode(block, path, key, syntax_tree) {
    const type = block["_attributes"]["type"].split("_")
    const category = type[0]
    const ID = type[1]
    let args
    let child_nodes
    
    //Adding arguments
    if (block["value"] != undefined) {
        args = blockToArgument(block["value"])
    }
    
    //Sets a json value at a specific dynamic path
    path.reduce((o, k) => o[k] = o[k] || {}, syntax_tree)[key] = new Node(category, ID, args, child_nodes)

    //Adding blocks which are in the same branch as the current one
    if (block["next"] != undefined && block["next"]["block"] != undefined) {
        //Blocks followed by an event are in the same branch as the event's one, but we want them as child nodes
        if (category == "events") child_nodes = blockToNode(block["next"]["block"], path.concat([key, "child_nodes"]), 1, syntax_tree)
        
        else blockToNode(block["next"]["block"], path, key + 1, syntax_tree)
    }
    
    //Adding child nodes
    if (category == "conditions" && block["statement"]["block"] != undefined) {
        child_nodes = blockToNode(block["statement"]["block"], path.concat([key, "child_nodes"]), 1, syntax_tree)
    }
    
    return syntax_tree
}

function Node(category, ID, args, child_nodes) {
    this.category = category
    this.ID = ID
    this.arguments = args
    this.child_nodes = child_nodes
    
    return this
}

function blockToArgument(block) {
    let args = {}
    let unconverted_args = []
    
    if (Object.keys(block)[0] != "0") { //If the block contains 1 argument
        unconverted_args.push(block)
    } else { //If the block contains several arguments
        unconverted_args = block
    }
    
    Object.keys(unconverted_args).forEach(element => {
        let category
        let ID
        let content
        let type
        let sub_arguments
        
        if (unconverted_args[element]["block"]["_attributes"]["type"] == "text") {
            category = "plain_text"
            type = "String"
            content = unconverted_args[element]["block"]["field"]["_text"]
        } else if (unconverted_args[element]["block"]["_attributes"]["type"] == "text_join") {
            category = "argument_constructor"
        } else if (unconverted_args[element]["block"]["_attributes"]["type"].startsWith("expressions")) {
            category = "expressions"
            ID = unconverted_args[element]["block"]["_attributes"]["type"].split("_")[1]
        } else if(unconverted_args[element]["block"]["_attributes"]["type"] == "parsed_as") {
            category = "parsed_as"
            type = unconverted_args[element]["block"]["field"]["_text"]
        }
        
        if (unconverted_args[element]["block"]["value"] != undefined) {
            sub_arguments = blockToArgument(unconverted_args[element]["block"]["value"])
        }
        
        //If the argument is part of an argument constructor
        if(unconverted_args[element]["_attributes"]["name"].startsWith("ADD")) args[parseInt(unconverted_args[element]["_attributes"]["name"].replace("ADD", ""))+1] = new Arg(category, ID, content, type, sub_arguments)
        //If the argument is part of a parsed_as argument
        else if(unconverted_args[element]["_attributes"]["name"] == "expression") args["1"] = new Arg(category, ID, content, type, sub_arguments)
        else args[unconverted_args[element]["_attributes"]["name"]] = new Arg(category, ID, content, type, sub_arguments)
    })
    
    return args
}

function Arg(category, ID, content, type, sub_arguments) {
    this.category = category
    this.ID = ID
    this.content = content
    this.type = type
    this.arguments = sub_arguments
    
    return this
}