var instance;

const fs = require("fs");
const dialog = require("electron").dialog
const appPath = require("electron").app.getAppPath()

const syntaxes = {
    events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
    commands: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/commands.json")),
    effects: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/effects.json")),
    expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
    conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
    loops: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/loops.json")),
    types: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/types.json"))
}

module.exports = {
    Transpiler: function Transpiler(listeners_syntax_tree, commands_syntax_tree, settings) {
        this.hasListeners = false
        this.commands = []
        instance = this

        this.generateListenersClass = function() {
            if(Object.keys(listeners_syntax_tree).length > 0) {
                this.imports = []
                this.current_event
                this.hasListeners = true

                const listeners_class = fs.readFileSync(appPath + '/src/transpiler/patterns/classes/Listeners.java', 'utf8')
                                        .replace("%child_nodes%", generateBranch(listeners_syntax_tree["nodes"]))
                                        .replace("%imports%", this.imports.map(element => "import " + element + ";").join("\r"))
                
                fs.mkdirSync(appPath + "/temp/fr/blosky", {recursive: true})
                fs.writeFile(appPath + '/temp/fr/blosky/Listeners.java', listeners_class, error => {
                    if(error) {
                        dialog.showErrorBox("Compilation failed", "Fail ID: 1\rError:" + error)
                        console.log(error)
                    }
                })
            }
        }

        this.generateCommandsClass = function() {
            if(Object.keys(commands_syntax_tree).length > 0) {
                this.imports = []
                this.current_event

                const commands_class = fs.readFileSync(appPath + '/src/transpiler/patterns/classes/Commands.java', 'utf8')
                                        .replace("%child_nodes%", generateBranch(commands_syntax_tree["nodes"]))
                                        .replace("%imports%", this.imports.map(element => "import " + element + ";").join("\r"))
                
                fs.mkdirSync(appPath + "/temp/fr/blosky", {recursive: true})
                fs.writeFile(appPath + '/temp/fr/blosky/Commands.java', commands_class, error => {
                    if(error) {
                        dialog.showErrorBox("Compilation failed", "Fail ID: 1\rError:" + error)
                        console.log(error)
                    }
                })
            }
        }
        
        this.generateMainClass = function() {
            let file = fs.readFileSync(appPath + '/src/transpiler/patterns/classes/Main.java', 'utf8')
                        .replace("%commands%", this.commands.map(command => 'this.getCommand("' + command.name + '").setExecutor(new Commands());').join("\r"))
                        .replace("%listeners%", this.hasListeners ? "Bukkit.getServer().getPluginManager().registerEvents(new Listeners(), this);" : "")

            fs.writeFile(appPath + '/temp/fr/blosky/Main.java', file, error => {
                if(error) {
                    dialog.showErrorBox("Compilation failed", "Fail ID: 2\rError:" + error)
                    console.log(error)
                }
            })
        }

        this.generatePluginConfig = function() {
            let file = fs.readFileSync(appPath + '/src/transpiler/patterns/config/plugin.yml', 'utf8')
                .replace("%name%", settings.name)
                .replace("%description%", settings.description)
                .replace("%version%", settings.version)
                .replace("%author%", settings.author)
            
            //Writting commands to the plugin.yml
            if(this.commands.length > 0) {
                file += "\rcommands:"
                const command_pattern = fs.readFileSync(appPath + '/src/transpiler/patterns/config/commands.yml', 'utf8') + "\r"

                this.commands.forEach(command => {
                    file += "\n"
                    file += command_pattern.replace("%name%", command.name)
                                           .replace("%description%", command.description)
                                           .replace("%permission%", command.permission)
                })
            }
            
            fs.writeFile(appPath + '/temp/plugin.yml', file, error => {
                if(error) {
                    dialog.showErrorBox("Compilation failed", "Fail ID: 3\rError:" + error)
                    console.log(error)
                }
            })
        }

        this.compile = (path) => {
            const child_process = require("child_process")
            
            //Compiling .java files to Java Bytecode (.class)
            child_process.execSync("javac -classpath " + appPath + "/src/transpiler/Libraries/Spigot/1.16.1.jar -target 8 -source 8 " + appPath + "/temp/fr/blosky/*.java")
            
            fs.unlinkSync(appPath + "/temp/fr/blosky/Main.java")
            if(this.hasListeners) fs.unlinkSync(appPath + "/temp/fr/blosky/Listeners.java")
            if(this.commands.length > 0) fs.unlinkSync(appPath + "/temp/fr/blosky/Commands.java")
            
            //Encapsulating the files into a .jar
            child_process.execSync('jar cvf "' + path + '.jar" -C ' + appPath + '/temp .')
        }

        this.clearTemporaryFolder = () => {
            fs.rmdirSync(appPath + "/temp", {recursive: true})
        }
    }
}

//Generates a branch of the syntax tree
function generateBranch(branch) {
    let transpiled_branch = ""

    Object.keys(branch).forEach(node => { //A node is a statement
        let category = branch[node]["category"] //The syntax category
        let ID = branch[node]["ID"] //The syntax ID
        
        let java_node = syntaxes[category][ID]["java_syntax"] //Contains the transpiled node
        
        if(category == "events" || category == "commands") instance.current_event = ID //Used for context dependent java syntax
        
        //Saving commands so they can be registered to the Main class and plugin.yml
        if(category == "commands") {
            instance.commands.push({
                "name": branch[node]["arguments"]["§{name}"]["value"],
                "description": branch[node]["arguments"]["§{description}"]["value"],
                "permission": branch[node]["arguments"]["§{permission}"]["value"]
            })
        }
        
        //Transpiling arguments
        if(syntaxes[category][ID]["arguments"] != null) {
            Object.keys(syntaxes[category][ID]["arguments"]).forEach(argument => {
                const required_type = syntaxes[category][ID]["arguments"][argument]["required_type"]
                java_node = java_node.replace(argument, generateArgument(branch[node]["arguments"][argument], required_type))
            })
        }
        
        if(branch[node]["child_nodes"] != undefined) { //If the branch contains another branch, we add it
            transpiled_branch += "\r"
                //Getting the pattern of the current node (eg "if()" for conditions)
                + fs.readFileSync(appPath + '/src/transpiler/patterns/control_flow_statements/' + category + '.java', 'utf8') 
                .replace("%instruction%", java_node)
                .replace("%ID%", node) //Each event has an ID
                .replace("%child_nodes%", generateBranch(branch[node]["child_nodes"]))
        } else { //If the branch doesn't contain another branch we directly add the node to the transpiled code
            transpiled_branch += "\r" + java_node
        }
        
        //Adding imports required by the node
        if(syntaxes[category][ID]["imports"] != null) {
            addImports(syntaxes[category][ID]["imports"])
        }
    })
    
    return transpiled_branch
}

//Generate an argument of a node
function generateArgument(properties, required_type) {
    const category = properties["category"] //The argument category
    let transpiled_argument //The argument in Java code
    let type //The return type of the argument (int, String, ...)
    
    switch (category) {
        case "plain_text":
            const value = properties["value"]
            
            if(required_type != "unimplemented" && syntaxes["types"][required_type]["match"] != undefined && value.match(syntaxes["types"][required_type]["match"])) {
                type = required_type //If the value already respects the required type match, there's no needs to use the conversion method
            } else {
                type = properties["type"]
                //TODO: Warn the user that the compilation may fails
            }
            
            if(syntaxes["types"][type]["syntax"] != undefined) { //If the argument's type has a special syntax (eg "" around Strings)
                transpiled_argument = syntaxes["types"][type]["syntax"].replace("%argument%", value)
            } else {
                transpiled_argument = value
            }
            break
        
        case "expressions":
        case "conditions":
            const ID = properties["ID"]
            type = syntaxes[category][ID]["return_type"]
            
            if(syntaxes[category][ID]["context_dependent"] == undefined || syntaxes[category][ID]["context_dependent"] == false) {
                transpiled_argument = syntaxes[category][ID]["java_syntax"]
            } else {
                if(syntaxes[category][ID]["java_syntax"]["exceptions"][instance.current_event] == undefined) {
                    transpiled_argument = syntaxes[category][ID]["java_syntax"]["default"]
                } else {
                    transpiled_argument = syntaxes[category][ID]["java_syntax"]["exceptions"][instance.current_event]
                }
            }
            
            if(properties["arguments"] != undefined) { //Adding arguments of the current argument
                Object.keys(properties["arguments"]).forEach(sub_argument /*the ID of the subargument (eg §{player})*/ => {
                    const required_type = syntaxes[category][ID]["arguments"][sub_argument]["required_type"]
                    transpiled_argument = transpiled_argument.replace(sub_argument, generateArgument(properties["arguments"][sub_argument], required_type))
                })
            }
            
            //Adding imports required by the expression/condition
            if(syntaxes[category][ID]["imports"] != null) {
                addImports(syntaxes[category][ID]["imports"])
            }
            break
        
        case "argument_constructor": //An argument constructor is more like a String builder
            if(properties["arguments"] != null) {
                transpiled_argument = "("
                type = "String"
                
                Object.keys(properties["arguments"]).forEach(sub_argument /*the ID of the subargument (eg §{player})*/ => {
                    transpiled_argument += generateArgument(properties["arguments"][sub_argument], "String")
                    if(Object.keys(properties["arguments"]).length != sub_argument) {
                        transpiled_argument += " + "
                    } else {
                        transpiled_argument += ")" //If it's the last argument of the argument constructor
                    }
                })
            }
            break
        
        case "parsed_as":
            if(properties["arguments"] != null) {
                //Generating argument with the type requested by the user
                transpiled_argument = generateArgument(properties["arguments"]["1"], properties["type"])
            }
            break
    }

    //Checking types and fixing them if needed
    if(required_type != type &&
        required_type != undefined &&
        required_type != "unimplemented" &&
        syntaxes["types"][required_type]["conversion"] != undefined &&
        syntaxes["types"][required_type]["conversion"][type] != undefined) {
            transpiled_argument = syntaxes["types"][required_type]["conversion"][type].replace("%argument%", transpiled_argument)
    }
    
    return transpiled_argument
}

function addImports(new_imports) {
    new_imports.forEach(new_import => {
        if(!(instance.imports.includes(new_import))) {
            instance.imports.push(new_import)
        }
    })
}