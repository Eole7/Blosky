const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

let appPath = function(){
    let app = require('electron').app
    let path = app.getAppPath()
    while(path.includes("\\")) {
        path = path.replace("\\", "/");
    }
    return path
}();

let syntaxes = {
    events: JSON.parse(fs.readFileSync(appPath + "/transpiler/syntaxes/events.json")),
    effects: JSON.parse(fs.readFileSync(appPath + "/transpiler/syntaxes/effects.json")),
    expressions: JSON.parse(fs.readFileSync(appPath + "/transpiler/syntaxes/expressions.json")),
    conditions: JSON.parse(fs.readFileSync(appPath + "/transpiler/syntaxes/conditions.json")),
    types: JSON.parse(fs.readFileSync(appPath + "/transpiler/syntaxes/types.json"))
}

function generateArgument(properties, required_type) {
    let java_argument; //The transpiled argument
    let type; //int, String, ...
    let category = properties["category"]; //expressions or plain_text

    if (category == "plain_text") {
        type = properties["type"];
        if (syntaxes["types"][type]["syntax"] != undefined) {
            java_argument = syntaxes["types"][type]["syntax"].replace("%argument%", properties["content"]);
        } else {
            java_argument = properties["content"];
        }
    } else if (category == "expressions") {
        type = syntaxes["expressions"][(properties["ID"])]["type"];
        java_argument = syntaxes["expressions"][(properties["ID"])]["java_syntax"];
    } else if (category == "argument_constructor") {
        java_argument = "(";
        type = "String"
        Object.keys(properties["arguments"]).forEach(function(sub_argument) {
            java_argument += generateArgument(properties["arguments"][sub_argument], "String")
            if (Object.keys(properties["arguments"]).length != sub_argument) {
                java_argument += " + ";
            } else {
                java_argument += ")"
            }
        });
    } 

    //Checking types and fixing them if needed
    if (required_type != "unimplemented" && required_type != type && required_type != undefined && syntaxes["types"][required_type]["conversion"] != undefined && syntaxes["types"][required_type]["conversion"][type] != undefined) {
        java_argument = syntaxes["types"][required_type]["conversion"][type].replace("%argument%", java_argument)
    }

    //If the current argument contains arguments
    if (properties["arguments"] != null && category != "argument_constructor") {
        Object.keys(properties["arguments"]).forEach(function(sub_argument) {
            java_argument = java_argument.replace(sub_argument, generateArgument(properties["arguments"][sub_argument], "unimplemented"))
        });
    }

    return java_argument;
}

function generateBranch(nodes) {
    let imports = [];
    let java_nodes = ""; //Contains the transpiled branch

    Object.keys(nodes).forEach(node => {
        let ID = nodes[node]["ID"];
        let category = nodes[node]["category"]
        let java_instruction = syntaxes[category][ID]["java_syntax"];

        //Getting arguments
        if (syntaxes[category][ID]["arguments"] != null) {
            Object.keys(syntaxes[category][ID]["arguments"]).forEach(function(argument_ID) {

                let required_type = syntaxes[category][ID]["arguments"][argument_ID]["required_type"];
                java_instruction = java_instruction.replace(argument_ID, generateArgument(nodes[node]["arguments"][argument_ID], required_type))

            });
        }

        if (nodes[node]["child_nodes"] != undefined) {
            //Transpiling child nodes of the current node
            let child_nodes = generateBranch(nodes[node]["child_nodes"])
            imports = imports.concat(child_nodes[1])

            java_nodes += "\r" + fs.readFileSync(appPath + '/transpiler/patterns/' + category + '.txt', 'utf8').replace("%instruction%", java_instruction).replace("%ID%", node).replace("%child_nodes%", child_nodes[0]);
        } else {
            java_nodes += "\r" + java_instruction
        }

        if (syntaxes[category][ID]["import"] != null && !(imports.includes(syntaxes[category][ID]["import"]))) {
            imports.push(syntaxes[category][ID]["import"]);
        }
    })

    return [java_nodes, imports];
}

module.exports = {

    generateJavaClass: function generateJavaClass(AST) {
        let file = fs.readFileSync(appPath + '/transpiler/patterns/Event.java', 'utf8');
        let java = generateBranch(AST);
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
            if (err) throw err;
        });
    },
    
    generateMainClass: function generateMainClass() {
        fs.writeFile(appPath + '/temp/fr/blosky/Main.java', fs.readFileSync(appPath + '/transpiler/patterns/Main.java', 'utf8'), function(err) {
            if (err) throw err;
        });
    },

    generatePluginYML: function generatePluginYML(settings) {
        let file = fs.readFileSync(appPath + '/transpiler/patterns/plugin.yml', 'utf8');
        file = file.replace("%name%", settings["name"]);
        file = file.replace("%description%", settings["description"]);
        file = file.replace("%version%", settings["version"]);
        file = file.replace("%author%", settings["author"]);
        fs.writeFile(appPath + '/temp/plugin.yml', file, function(err) {
            if (err) throw err;
        });
    },

    compile: function compile(filename) {
        const child_process = require("child_process");

        child_process.execSync("javac -classpath " + appPath + "/transpiler/Libraries/Spigot/1.12.2.jar -target 8 -source 8 " + appPath + "/temp/fr/blosky/*.java", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });

        fs.unlinkSync(appPath + "/temp/fr/blosky/Main.java")
        fs.unlinkSync(appPath + "/temp/fr/blosky/Event.java");

        child_process.execSync('jar cvf "' + filename + '.jar" -C ' + appPath + '/temp .', (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            console.log(`stdout: ${stdout}`);
        });

        fs.rmdir(appPath + "/temp", { recursive: true }, (err) => {
            if (err) {
                throw err;
            }
        });
    }
};