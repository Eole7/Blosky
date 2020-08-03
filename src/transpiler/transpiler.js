const fs = require("fs")
const appPath = require("electron").app.getAppPath()
const dialog = require("electron").dialog

const syntaxes = {
    events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
    effects: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/effects.json")),
    expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
    conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
    types: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/types.json"))
}

var imports = []

module.exports = {
    generateListenersClass: syntax_tree => {
        imports = []
        const listeners_class = fs.readFileSync(appPath + '/src/transpiler/patterns/Listeners.java', 'utf8')
                              .replace("%child_nodes%", generateBranch(syntax_tree["nodes"]))
                              .replace("%imports%", imports.map(element => "import " + element + ";").join("\r"))
        
        fs.mkdirSync(appPath + "/temp/fr/blosky", {recursive: true})
        fs.writeFile(appPath + '/temp/fr/blosky/Listeners.java', listeners_class, error => {
            if(error) {
                dialog.showErrorBox("Compilation failed", "Fail ID: 1\rError:" + error)
                console.log(error)
            }
        })
    },
    
    generateMainClass: () => {
        fs.writeFile(appPath + '/temp/fr/blosky/Main.java', fs.readFileSync(appPath + '/src/transpiler/patterns/Main.java', 'utf8'), error => {
            if (error) {
                dialog.showErrorBox("Compilation failed", "Fail ID: 2\rError:" + error)
                console.log(error)
            }
        })
    },
    
    generatePluginConfig: settings => {
        const file = fs.readFileSync(appPath + '/src/transpiler/patterns/plugin.yml', 'utf8')
            .replace("%name%", settings["name"])
            .replace("%description%", settings["description"])
            .replace("%version%", settings["version"])
            .replace("%author%", settings["author"])
        
        fs.writeFile(appPath + '/temp/plugin.yml', file, error => {
            if (error) {
                dialog.showErrorBox("Compilation failed", "Fail ID: 3\rError:" + error)
                console.log(error)
            }
        })
    },
    
    compile: filename => {
        const child_process = require("child_process")
        
        //Compiling .java files to Java Bytecode (.class)
        //TODO: async compilation for reporting error to user
        child_process.execSync("javac -classpath " + appPath + "/src/transpiler/Libraries/Spigot/1.12.2.jar -target 8 -source 8 " + appPath + "/temp/fr/blosky/*.java")
        
        fs.unlinkSync(appPath + "/temp/fr/blosky/Main.java")
        fs.unlinkSync(appPath + "/temp/fr/blosky/Listeners.java")
        
        //Encapsulates the files into a .jar
        //TODO: async encapsulation for reporting error to user
        child_process.execSync('jar cvf "' + filename + '.jar" -C ' + appPath + '/temp .')
    },
    
    clearTemporaryFolder: () => {
        fs.rmdir(appPath + "/temp", {recursive: true}, error => {
            if (error) {
                dialog.showErrorBox("Compilation failed", "Fail ID: 4\rError:" + error)
                console.log(error)
            }
        })
    }
}

function generateBranch(nodes) {
    let java_nodes = "" //Contains the transpiled branch
    
    Object.keys(nodes).forEach(node => {
        const category = nodes[node]["category"]
        let ID = nodes[node]["ID"]
        let java_node = syntaxes[category][ID]["java_syntax"] //Contains the transpiled node

        //Transpiling arguments
        if (syntaxes[category][ID]["arguments"] != null) {
            Object.keys(syntaxes[category][ID]["arguments"]).forEach(argument => {
                const required_type = syntaxes[category][ID]["arguments"][argument]["required_type"]
                java_node = java_node.replace(argument, generateArgument(nodes[node]["arguments"][argument], required_type))
            })
        }
        
        if (nodes[node]["child_nodes"] != undefined) { //Transpiling child nodes of the current node
            java_nodes += "\r" 
                + fs.readFileSync(appPath + '/src/transpiler/patterns/' + category + '.txt', 'utf8')
                .replace("%instruction%", java_node)
                .replace("%ID%", node)
                .replace("%child_nodes%", generateBranch(nodes[node]["child_nodes"]))
        } else {
            java_nodes += "\r" + java_node
        }

        //Adding imports required by the current node
        if (syntaxes[category][ID]["imports"] != null) {
            addImports(syntaxes[category][ID]["imports"])
        }
    })
    
    return java_nodes
}

function generateArgument(properties, required_type) {
    const category = properties["category"]
    let java_argument //The transpiled argument
    let type //int, String, ...

    switch(category) {
        case "plain_text":
            type = properties["type"]
            if (syntaxes["types"][type]["syntax"] != undefined) { //If the argument's type has a special syntax (eg "" around Strings)
                java_argument = syntaxes["types"][type]["syntax"].replace("%argument%", properties["content"])
            } else {
                java_argument = properties["content"]
            }
            break
        
        case "expressions":
            type = syntaxes["expressions"][(properties["ID"])]["type"]
            java_argument = syntaxes["expressions"][(properties["ID"])]["java_syntax"]

            if (properties["arguments"] != undefined) { //Adding sub arguments
                Object.keys(properties["arguments"]).forEach(sub_argument => {
                    java_argument = java_argument.replace(sub_argument, generateArgument(properties["arguments"][sub_argument], "unimplemented"))
                })
            }

            //Adding imports required by the expression
            if(syntaxes[category][(properties["ID"])]["imports"] != null) addImports(syntaxes[category][(properties["ID"])]["imports"])
            break
        
        case "argument_constructor":
            if (properties["arguments"] != null) {
                java_argument = "("
                type = "String"

                Object.keys(properties["arguments"]).forEach(sub_argument => {
                    java_argument += generateArgument(properties["arguments"][sub_argument], "String")
                    if (Object.keys(properties["arguments"]).length != sub_argument) {
                        java_argument += " + "
                    } else {
                        java_argument += ")"
                    }
                })
            }
            break
        
        case "parsed_as":
            if (properties["arguments"] != null) {
                java_argument = generateArgument(properties["arguments"]["1"], properties["type"])
            }
            break
    }
    
    //Checking types and fixing them if needed
    if (required_type != "unimplemented" &&
        required_type != undefined &&
        required_type != type &&
        syntaxes["types"][required_type]["conversion"] != undefined &&
        syntaxes["types"][required_type]["conversion"][type] != undefined) {
            java_argument = syntaxes["types"][required_type]["conversion"][type].replace("%argument%", java_argument)
    }
    
    return java_argument
}

function addImports(new_imports) {
    new_imports.forEach(new_import => {
        if (!(imports.includes(new_import))) imports.push(new_import)
    })
}