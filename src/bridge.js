function exportProject(code, settings) {

    let AST = blocklyToAST(code)

    const transpiler = require('electron').remote.require('./transpiler/transpiler.js');
    transpiler.generateJavaClass(AST["nodes"])
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
    var convert = require('xml-js');

    let project = JSON.parse(convert.xml2json(code, {
        compact: true
    }))["xml"]
    project = blockToNode(project["block"], ["nodes"], 1, {})
    return project
}

function blockToNode(block, path, key, converted) {
    let type = block["_attributes"]["type"].split("_")
    let category = type[0]
    let ID = type[1]
    let child_nodes;
    let args = {};

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
            //Adding blocks which are in the same block as the current one
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

    if (Object.keys(block)[0] != "0") {
        unconverted_args.push(block)
    } else {
        unconverted_args = block;
    }

    Object.keys(unconverted_args).forEach(element => {

        let category;
        let ID;
        let content; //Either the ID of the expression or the content of the String

        if (unconverted_args[element]["block"]["_attributes"]["type"] == "text") {
            category = "plain_text"
            ID = "String"
            content = unconverted_args[element]["block"]["field"]["_text"]
        } else if (unconverted_args[element]["block"]["_attributes"]["type"].startsWith("expressions")) {
            category = "expressions"
            ID = unconverted_args[element]["block"]["_attributes"]["type"].split("_")[1]
        }

        let subargs;
        if (unconverted_args[element]["block"]["value"] != undefined) {
            subargs = blockToArgument(unconverted_args[element]["block"]["value"])
        }

        args[unconverted_args[element]["_attributes"]["name"]] = new Arg(category, ID, content, subargs)

    })

    return args;
}

function Arg(category, ID, content, subargs) {
    this.category = category
    if (category == "plain_text") {
        this.content = content
        this.type = ID
    } else if (category == "expressions") {
        this.ID = ID;
    }
    this.arguments = subargs
    return this
}