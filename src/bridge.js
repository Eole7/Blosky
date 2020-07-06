function exportProject(code, settings) {
    const transpiler = require('electron').remote.require('./transpiler/transpiler.js');
    transpiler.generateJavaClass(blocklyToAST(code)["nodes"])
    transpiler.generateMainClass()
    transpiler.generatePluginYML(settings)

    const dialog = require('electron').remote.dialog
    var options = {
        title: "Save plugin",
        buttonLabel: "Save plugin",
    }
    dialog.showSaveDialog(options).then(result => {
        if (result.canceled == false) {
            transpiler.compile(result.filePath)
            alert(settings["name"] + " was successfully compiled to " + result.filePath)
        }
    })
}

function blocklyToAST(code) {
    let project = JSON.parse(require('xml-js').xml2json(code, {compact: true}))["xml"]
    let AST = {};

    //If the project contains multiple events
    if (Object.keys(project["block"])[0] == "0") {
        Object.keys(project["block"]).forEach(value => {
            AST = blockToNode(project["block"][value], ["nodes"], parseInt(value)+1, AST)
        })
    } else { //If the project contains 1 event
        AST = blockToNode(project["block"], ["nodes"], 1, AST)
    }

    return AST
}

function blockToNode(block, path, key, converted) {
    let type = block["_attributes"]["type"].split("_")
    let category = type[0]
    let ID = type[1]
    let child_nodes;
    let args;

    if (block["value"] != undefined) {
        args = blockToArgument(block["value"])
    }

    //Sets a json value at a specific dynamic path
    path.reduce((o, k) => o[k] = o[k] || {}, converted)[key] = new Node(category, ID, args, child_nodes);

    if (block["next"] != undefined && block["next"]["block"] != undefined) {
        if (category == "events") {
            //Adding childs nodes
            child_nodes = blockToNode(block["next"]["block"], path.concat([key, "child_nodes"]), 1, converted)
        } else {
            //Adding blocks which are in the same branch as the current one
            blockToNode(block["next"]["block"], path, key + 1, converted)
        }
    }

    //Adding child nodes
    if (category == "conditions" && block["statement"]["block"] != undefined) {
        child_nodes = blockToNode(block["statement"]["block"], path.concat([key, "child_nodes"]), 1, converted)
    }

    return converted
}

function Node(category, ID, args, child_nodes) {
    this.category = category;
    this.ID = ID;
    this.arguments = args;
    this.child_nodes = child_nodes

    return this
}

function blockToArgument(block) {
    let args = {};
    let unconverted_args = [];

    //If the block contains 1 argument
    if (Object.keys(block)[0] != "0") {
        unconverted_args.push(block)
    } else { //If the block contains several arguments
        unconverted_args = block;
    }

    Object.keys(unconverted_args).forEach(element => {
        let category;
        let ID;
        let content;
        let type;
        let sub_arguments;

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
        else if(unconverted_args[element]["_attributes"]["name"] == "expression") args["1"] = new Arg(category, ID, content, type, sub_arguments)
        else args[unconverted_args[element]["_attributes"]["name"]] = new Arg(category, ID, content, type, sub_arguments)
    })

    return args;
}

function Arg(category, ID, content, type, sub_arguments) {
    this.category = category
    this.ID = ID;
    this.content = content
    this.type = type
    this.arguments = sub_arguments

    return this
}