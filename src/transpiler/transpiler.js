const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');

function getPath() {
    let app = require('electron').app
    let path = app.getAppPath()
    while(path.includes("\\")) {
        path = path.replace("\\", "/");
    }
    return path
}

let syntaxes = {
    events: JSON.parse(fs.readFileSync(getPath() + "/transpiler/syntaxes/events.json")),
    effects: JSON.parse(fs.readFileSync(getPath() + "/transpiler/syntaxes/effects.json")),
    expressions: JSON.parse(fs.readFileSync(getPath() + "/transpiler/syntaxes/expressions.json")),
    conditions: JSON.parse(fs.readFileSync(getPath() + "/transpiler/syntaxes/conditions.json")),
    types: JSON.parse(fs.readFileSync(getPath() + "/transpiler/syntaxes/types.json"))
}

function generateArgument(properties, required_type) {

    let java_argument; //The transpiled argument
    let type; //int, String, ...
    let category = properties["category"]; //expressions or plain_text

    //NOT SUPPORTED BY THE UI YET
    //If an argument is constructed of several types, the argument is divided into several arguments and then reassembled
    //eg send "Hi" and player's health to player 
    if (properties["multitypes"] == "true") {
        java_argument = "";
        Object.keys(properties["types"]).forEach(function(type) {
            java_argument += generateArgument(properties["types"][type], "unimplemented")
            if (Object.keys(properties["types"]).length != type) {
                java_argument += " + ";
            }
        });

    } else {

        if (category == "plain_text") {
            type = properties["type"];
            if (syntaxes["types"][type]["syntax"] != undefined) {
                java_argument = syntaxes["types"][type]["syntax"].replace("%argument%", properties["content"]);
            } else {
                java_argument = properties["content"];
            }
        }
        if (category == "expressions") {
            type = syntaxes["expressions"][(properties["ID"])]["type"];
            java_argument = syntaxes["expressions"][(properties["ID"])]["java_syntax"];
        }

        //Checking types and fixing them if needed
        if (required_type != "unimplemented" && required_type != type && required_type != undefined && syntaxes["types"][required_type]["conversion"] != undefined && syntaxes["types"][required_type]["conversion"][type] != undefined) {
            java_argument = syntaxes["types"][required_type]["conversion"][type].replace("%argument%", java_argument)
        }

        //If the current argument contains arguments
        if (properties["arguments"] != null) {
            Object.keys(properties["arguments"]).forEach(function(argument_ID) {
                java_argument = java_argument.replace(argument_ID, generateArgument(properties["arguments"][argument_ID], "unimplemented"))
            });
        }

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

            java_nodes += "\r" + fs.readFileSync(getPath() + '/transpiler/patterns/' + category + '.txt', 'utf8').replace("%instruction%", java_instruction).replace("%ID%", node).replace("%child_nodes%", child_nodes[0]);
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

        let file = fs.readFileSync(getPath() + '/transpiler/patterns/Event.java', 'utf8');
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

        fs.mkdirSync(getPath() + "/temp")
        fs.mkdirSync(getPath()+ "/temp/fr")
        fs.mkdirSync(getPath() + "/temp/fr/blosky")
        fs.writeFile(getPath() + '/temp/fr/blosky/Event.java', file, function(err) {
            if (err) throw err;
        });
    },
    
    generateMainClass: function generateMainClass() {
        fs.writeFile(getPath() + '/temp/fr/blosky/Main.java', fs.readFileSync(getPath() + '/transpiler/patterns/Main.java', 'utf8'), function(err) {
            if (err) throw err;
        });
    },

    generatePluginYML: function generatePluginYML(settings) {
        let file = fs.readFileSync(getPath() + '/transpiler/patterns/plugin.yml', 'utf8');
        file = file.replace("%name%", settings["name"]);
        file = file.replace("%description%", settings["description"]);
        file = file.replace("%version%", settings["version"]);
        file = file.replace("%author%", settings["author"]);
        fs.writeFile(getPath() + '/temp/plugin.yml', file, function(err) {
            if (err) throw err;
        });
    },

    compile: function compile(filename) {

        const child_process = require("child_process");

        child_process.execSync("javac -classpath " + getPath() + "/transpiler/Libraries/Spigot/1.12.2.jar -target 8 -source 8 " + getPath() + "/temp/fr/blosky/*.java", (error, stdout, stderr) => {
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

        fs.unlinkSync(getPath() + "/temp/fr/blosky/Main.java")
        fs.unlinkSync(getPath() + "/temp/fr/blosky/Event.java");

        child_process.execSync('jar cvf "' + filename + '.jar" -C ' + getPath() + '/temp .', (error, stdout, stderr) => {
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

        fs.rmdir(getPath() + "/temp", { recursive: true }, (err) => {
            if (err) {
                throw err;
            }
        });
    }
};