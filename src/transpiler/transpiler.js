const fs = require('fs')
let appPath = require('electron').app.getAppPath()

let syntaxes = {
    events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
    effects: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/effects.json")),
    expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
    conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
    types: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/types.json"))
}

module.exports = {
    generateJavaClass: function generateJavaClass(AST) {
        let file = fs.readFileSync(appPath + '/src/transpiler/patterns/Event.java', 'utf8')
        let java = generateBranch(AST) //java[0] corresponds to the transpiled code, java[1] to the new imports
        file = file.replace("%child_nodes%", java[0])
        
        //Adding imports
        java[1].forEach((element, index) => {
            if (index + 1 != java[1].length) {
                file = file.replace("%imports%", "import " + element + "; \r%imports%")
            } else {
                file = file.replace("%imports%", "import " + element + ";")
            }
        })
        
        fs.mkdirSync(appPath + "/temp")
        fs.mkdirSync(appPath+ "/temp/fr")
        fs.mkdirSync(appPath + "/temp/fr/blosky")
        fs.writeFile(appPath + '/temp/fr/blosky/Event.java', file, function(err) {
            if (err) throw err
        })
    },
    
    generateMainClass: function generateMainClass() {
        fs.writeFile(appPath + '/temp/fr/blosky/Main.java', fs.readFileSync(appPath + '/src/transpiler/patterns/Main.java', 'utf8'), function(err) {
            if (err) throw err
        })
    },
    
    generatePluginYML: function generatePluginYML(settings) {
        let file = fs.readFileSync(appPath + '/src/transpiler/patterns/plugin.yml', 'utf8')
        file = file.replace("%name%", settings["name"])
        file = file.replace("%description%", settings["description"])
        file = file.replace("%version%", settings["version"])
        file = file.replace("%author%", settings["author"])
        fs.writeFile(appPath + '/temp/plugin.yml', file, function(err) {
            if (err) throw err
        })
    },
    
    compile: function compile(filename) {
        const child_process = require("child_process")
        
        //Compiling .java files to Java bytecode (.class)
        child_process.execSync("javac -classpath " + appPath + "/src/transpiler/Libraries/Spigot/1.12.2.jar -target 8 -source 8 " + appPath + "/temp/fr/blosky/*.java", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`)
                return
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`)
                return
            }
            console.log(`stdout: ${stdout}`)
        })
        
        fs.unlinkSync(appPath + "/temp/fr/blosky/Main.java")
        fs.unlinkSync(appPath + "/temp/fr/blosky/Event.java")
        
        //Encapsulates the files into a .jar
        child_process.execSync('jar cvf "' + filename + '.jar" -C ' + appPath + '/temp .', (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`)
                return
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`)
                return
            }
            console.log(`stdout: ${stdout}`)
        })
    },
    
    clearFolder: function clearFolder(){
        fs.rmdir(appPath + "/temp", { recursive: true }, (err) => {
            if (err) throw err
        })
    }
}

function generateBranch(nodes) {
    let imports = []
    let java_nodes = "" //Contains the transpiled branch
    
    Object.keys(nodes).forEach(node => {
        let ID = nodes[node]["ID"]
        let category = nodes[node]["category"]
        let java_node = syntaxes[category][ID]["java_syntax"]

        //Transpiling arguments
        if (syntaxes[category][ID]["arguments"] != null) {
            Object.keys(syntaxes[category][ID]["arguments"]).forEach(argument => {
                let required_type = syntaxes[category][ID]["arguments"][argument]["required_type"]
                java_node = java_node.replace(argument, generateArgument(nodes[node]["arguments"][argument], required_type))
            })
        }
        
        if (nodes[node]["child_nodes"] != undefined) { //Transpiling child nodes of the current node
            let child_nodes = generateBranch(nodes[node]["child_nodes"])
            imports = imports.concat(child_nodes[1])

            java_nodes += "\r" + fs.readFileSync(appPath + '/src/transpiler/patterns/' + category + '.txt', 'utf8').replace("%instruction%", java_node).replace("%ID%", node).replace("%child_nodes%", child_nodes[0])
        } else {
            java_nodes += "\r" + java_node
        }
        
        if (syntaxes[category][ID]["import"] != null && !(imports.includes(syntaxes[category][ID]["import"]))) {
            imports.push(syntaxes[category][ID]["import"])
        }
    })
    
    return [java_nodes, imports]
}


function generateArgument(properties, required_type) {
    let java_argument //The transpiled argument
    let type //int, String, ...
    let category = properties["category"]

    switch(category) {
        case "plain_text":
            type = properties["type"]
            if (syntaxes["types"][type]["syntax"] != undefined) { //If the argument's type has a special syntax (eg "" around Strings)
                java_argument = syntaxes["types"][type]["syntax"].replace("%argument%", properties["content"])
            } else {
                java_argument = properties["content"]
            }

            break;
        
        case "expressions":
            type = syntaxes["expressions"][(properties["ID"])]["type"]
            java_argument = syntaxes["expressions"][(properties["ID"])]["java_syntax"]

            if (properties["arguments"] != undefined) { //Adding sub arguments
                Object.keys(properties["arguments"]).forEach(sub_argument => {
                    java_argument = java_argument.replace(sub_argument, generateArgument(properties["arguments"][sub_argument], "unimplemented"))
                })
            }

            break;
        
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

            break;
        
        case "parsed_as":
            if (properties["arguments"] != null) {
                java_argument = generateArgument(properties["arguments"]["1"], properties["type"])
            }

            break;
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