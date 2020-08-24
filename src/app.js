const fs = require('fs')
const {app, BrowserWindow} = require('electron')

global.settings = { //Global app storage: can be accessed from both main and renderer process
    "name": null,
    "version": null,
    "author": null,
    "description": null
}

global.workspace = {
    "code": null,
    "path": null,
    "has_unsaved_modifications": false
}

function createWindow() {
    const window = new BrowserWindow({
        icon: app.getAppPath() + "/resources/icon.png",
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true, //accessing Node.js resources from within the renderer process
            enableRemoteModule: true
        }
    })
    window.loadFile(app.getAppPath() + '/src/pages/index.html')
    window.setMenuBarVisibility(false)
    
    function checkUnsavedModifications(event) {
        if(global.workspace.has_unsaved_modifications) {
            const choice = require("electron").dialog.showMessageBoxSync(window,
                {
                    type: "warning",
                    buttons: ["Save", "Don't save", "Cancel"],
                    title: "Confirm closing",
                    message: "You have unsaved changes"
                })
            switch (choice) {
                case 0: //If the user clicked on Save
                    let path;
                    if(global.workspace.path != null) { //If it's an existing project
                        path = global.workspace.path
                    } else { //If it's a new project, we ask the user for the path
                        const options = {
                            title: "Save Project",
                            buttonLabel: "Save Project",
                            filters: [{
                                name: 'Blosky Projects',
                                extensions: ['bsk']
                            }]
                        }
                        path = require("electron").dialog.showSaveDialogSync(window, options)
                        if(path == undefined) { //If the user canceled saving
                            event.preventDefault()
                            return
                        }
                    }
                    fs.writeFile(path, (JSON.stringify(global.settings) + "\r" + global.workspace.code), error => {
                        if(error) throw error
                    })
                    break

                case 2: //If the user clicked on Cancel
                    event.preventDefault()
                    break
            }
        }
    }

    window.on('close', checkUnsavedModifications)
    window.webContents.on("will-navigate", (event, url) => {
        if(url.endsWith("index.html")) { //When the user clicks on "Switch Workspace"
            checkUnsavedModifications(event)
        }
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if(process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})


//Get the syntaxes from the renderer process
function getAllSyntaxes() {
    const appPath = require('electron').remote.app.getAppPath()
    
    return {
        events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
        commands: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/commands.json")),
        effects: JSON.parse(fs.readFileSync(appPath+ "/src/transpiler/syntaxes/effects.json")),
        expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
        conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
        loops: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/loops.json"))
    } 
}

//Open a project from the renderer process
function openProject() {
    const dialog = require('electron').remote.dialog
    const options = {
        properties: ['openFile'],
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    dialog.showOpenDialog(options).then(result => {
        if(result.canceled == false) {
            const lines = fs.readFileSync(result.filePaths[0], "utf-8").split("\r")
            const settings = JSON.parse(lines[0])
            setCode(lines[1])
            setSetting("name", settings["name"])
            setSetting("version", settings["version"])
            setSetting("author", settings["author"])
            setSetting("description", settings["description"])
            setPath(result.filePaths[0])
            window.location.replace("plugin_config.html")
        }
    })
}

//Save a project from the renderer process
function saveProject(project, path) { //TODO: directly get the project & path from the cache
    if(path == null) { //If it's a new project
        saveProjectAs(project)
    } else {
        fs.writeFile(path, project, error => {
            if(error) throw error
        })
        setUnsavedModifications(false)
    }
}

//Save a project with path input from the renderer process
function saveProjectAs(project) { //TODO: directly get the project from the cache
    const dialog = require('electron').remote.dialog
    const options = {
        title: "Save Project",
        buttonLabel: "Save Project",
        filters: [{
            name: 'Blosky Projects',
            extensions: ['bsk']
        }]
    }
    dialog.showSaveDialog(options).then(result => {
        if(result.canceled == false) {
            setPath(result.filePath)
            fs.writeFile(result.filePath, project, error => {
                if(error) throw error
            })
        }
    })
    setUnsavedModifications(false)
}


//Access the global storage from the renderer process
function setPath(value){
    require('electron').remote.getGlobal('workspace').path = value
}

function getPath(){
    return require('electron').remote.getGlobal('workspace').path
}

function setCode(value) {
    require('electron').remote.getGlobal('workspace').code = value
}

function getCode() {
    return require('electron').remote.getGlobal('workspace').code
}

function setSetting(key, value) {
    require('electron').remote.getGlobal('settings')[key] = value
}

function getSetting(key) {
    return require('electron').remote.getGlobal('settings')[key]
}

function clearStorage() { //TODO: find a cleaner way to do that
    require('electron').remote.getGlobal('workspace').code = null
    require('electron').remote.getGlobal('settings').name = null
    require('electron').remote.getGlobal('settings').version = null
    require('electron').remote.getGlobal('settings').author = null
    require('electron').remote.getGlobal('settings').description = null
    require('electron').remote.getGlobal('workspace').path = null
    require('electron').remote.getGlobal('workspace').has_unsaved_modifications = false
}

function setUnsavedModifications(boolean) {
    require('electron').remote.getGlobal('workspace').has_unsaved_modifications = boolean
}