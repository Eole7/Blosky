const fs = require('fs')
const {app, BrowserWindow} = require('electron')

global.settings = { //Global app storage: can be accessed from the main and renderer processes
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
    const win = new BrowserWindow({
        icon: app.getAppPath() + "/resources/icon.png",
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true //ability of accessing Node.js resources from within the renderer process
        }
    })
    win.loadFile(app.getAppPath() + '/src/pages/index.html')
    win.setMenuBarVisibility(false)
    
    function checkUnsavedModifications(event) {
        if(global.workspace.has_unsaved_modifications) {
            const choice = require("electron").dialog.showMessageBoxSync(win,
                {
                    type: "warning",
                    buttons: ["Save", "Don't save", "Cancel"],
                    title: "Confirm closing",
                    message: "You have unsaved changes"
                }) 
            switch (choice) {
                case 0:
                    const file = JSON.stringify(global.settings) + "\r" + global.workspace.code
                    if(global.workspace.path != null) {
                        fs.writeFile(global.workspace.path, file, error => {
                            if (error) throw error
                        })
                    } else {
                        const options = {
                            title: "Save Project",
                            buttonLabel: "Save Project",
                            filters: [{
                                name: 'Blosky Projects',
                                extensions: ['bsk']
                            }]
                        }
                        const result = require("electron").dialog.showSaveDialogSync(win, options)
                        if (result != undefined) { //If the user selected a path
                            global.workspace.path = result
                            fs.writeFile(result, file, error => {
                                if (error) throw error
                            })
                        } else { //If the user canceled saving
                            event.preventDefault()
                        }
                    }
                    break

                case 2:
                    event.preventDefault()
                    break
            }
        }
    }

    win.on('close', checkUnsavedModifications)
    win.webContents.on("will-navigate", (event, url) => {
        if(url.endsWith("index.html")) {  //When the user clicks on "Switch Workspace"
            checkUnsavedModifications(event)
        }
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

function getAllSyntaxes() {
    const appPath = require('electron').remote.app.getAppPath()
    
    return {
        events: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/events.json")),
        effects: JSON.parse(fs.readFileSync(appPath+ "/src/transpiler/syntaxes/effects.json")),
        expressions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/expressions.json")),
        conditions: JSON.parse(fs.readFileSync(appPath + "/src/transpiler/syntaxes/conditions.json")),
    } 
}

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
        if (result.canceled == false) {
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

function saveProject(project, path) {
    if (path == null) {
        saveProjectAs(project)
    } else {
        fs.writeFile(path, project, error => {
            if (error) throw error
        })
        setUnsavedModifications(false)
    }
}

function saveProjectAs(project) {
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
        if (result.canceled == false) {
            setPath(result.filePath)
            fs.writeFile(result.filePath, project, function(err) {
                if (err) throw err
            })
        }
    })
    setUnsavedModifications(false)
}

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